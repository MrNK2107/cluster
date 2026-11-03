import type { BoardDocument, CardData, Viewport, WorkspaceData } from '../types';
import { sharedPayload, type SharedSpace } from './sharing';

/**
 * The app works on one workspace holding every space the person can see.
 * Their own spaces are saved to their account row; each shared space is saved
 * to its own row. These helpers move between the two shapes.
 */

export interface SplitWorkspace {
  /** What goes into the account row: own spaces, plus camera positions in shared ones. */
  personal: WorkspaceData;
  /** Shared spaces as written to their rows, by space id. */
  shared: Map<string, BoardDocument>;
}

export function splitWorkspace(ws: WorkspaceData): SplitWorkspace {
  const sharedViewports: Record<string, Viewport> = {};
  const shared = new Map<string, BoardDocument>();
  const own: BoardDocument[] = [];
  for (const doc of ws.documents) {
    if (doc.share) {
      shared.set(doc.share.spaceId, sharedPayload(doc));
      sharedViewports[doc.id] = doc.viewport;
    } else {
      own.push(doc);
    }
  }
  const { sharedViewports: _old, ...rest } = ws;
  return {
    personal: { ...rest, documents: own, ...(Object.keys(sharedViewports).length ? { sharedViewports } : {}) },
    shared,
  };
}

/** Puts the account row and the shared rows back together into one workspace. */
export function mergeWorkspace(personal: WorkspaceData, spaces: SharedSpace[]): WorkspaceData {
  const viewports = personal.sharedViewports ?? {};
  const sharedDocs = spaces.map(({ doc, share }) => ({
    ...doc,
    viewport: viewports[doc.id] ?? doc.viewport,
    share,
  }));
  const documents = [...personal.documents, ...sharedDocs];
  const { sharedViewports: _vp, ...rest } = personal;
  return {
    ...rest,
    documents,
    activeDocId: documents.some((d) => d.id === personal.activeDocId) ? personal.activeDocId : (documents[0]?.id ?? ''),
  };
}

/* --------------------------------------------------------------------------
 * Merging concurrent edits to a shared space
 * ----------------------------------------------------------------------- */

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Three-way merge of a list of things with ids: each item takes whichever side changed it. */
function mergeById<T extends { id: string }>(base: T[], mine: T[], theirs: T[]): T[] {
  const baseById = new Map(base.map((x) => [x.id, x]));
  const mineById = new Map(mine.map((x) => [x.id, x]));
  const theirsById = new Map(theirs.map((x) => [x.id, x]));
  const out: T[] = [];
  const seen = new Set<string>();

  const pick = (id: string): T | null => {
    const b = baseById.get(id);
    const m = mineById.get(id);
    const t = theirsById.get(id);
    if (!b) return m ?? t ?? null; // Added on one side (or both: keep mine).
    if (!m) return t && !same(t, b) ? t : null; // I deleted it; keep only if they changed it since.
    if (!t) return !same(m, b) ? m : null; // They deleted it; keep only if I changed it since.
    return same(m, b) ? t : m;
  };

  for (const list of [mine, theirs]) {
    for (const x of list) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      const v = pick(x.id);
      if (v) out.push(v);
    }
  }
  return out;
}

/**
 * Combines my edits with someone else's, both made since `base` (the copy
 * both started from). Where both changed the same card, mine wins. My camera
 * position is kept.
 */
export function mergeDocs(base: BoardDocument, mine: BoardDocument, theirs: BoardDocument): BoardDocument {
  const field = <K extends keyof BoardDocument>(k: K) => (same(mine[k], base[k]) ? theirs[k] : mine[k]);
  const clusters = mergeById(base.clusters, mine.clusters, theirs.clusters);
  const cards = mergeById(base.cards, mine.cards, theirs.cards);
  const ids = new Set([...clusters.map((c) => c.id), ...cards.map((c) => c.id)]);
  const connections = mergeById(base.connections, mine.connections, theirs.connections).filter(
    (c) => ids.has(c.fromId) && ids.has(c.toId),
  );
  return {
    ...mine,
    title: field('title'),
    icon: field('icon'),
    color: field('color'),
    description: field('description'),
    // Protection is only ever switched on from the app, so either side having it wins.
    ...(mine.protected || theirs.protected ? { protected: true } : {}),
    updatedAt: Math.max(mine.updatedAt, theirs.updatedAt),
    clusters,
    cards: cards.map((c) => {
      const out = c.clusterId && !clusters.some((cl) => cl.id === c.clusterId) ? { ...c, clusterId: null } : c;
      return keepAllVotes(out, mine.cards, theirs.cards);
    }),
    connections,
  };
}

/** Two people agreeing at the same time must both count, whichever copy won. */
function keepAllVotes(card: CardData, mine: CardData[], theirs: CardData[]): CardData {
  const r = card.rejection;
  if (!r) return card;
  const approvals = new Set(r.approvals);
  for (const other of [...mine, ...theirs]) {
    if (other.id === card.id && other.rejection?.id === r.id) other.rejection.approvals.forEach((a) => approvals.add(a));
  }
  return approvals.size === r.approvals.length ? card : { ...card, rejection: { ...r, approvals: [...approvals] } };
}

/**
 * The database lets someone other than the owner remove a card only once
 * everyone has agreed to reject it, and add only their own vote (see
 * supabase/migrations/*_protected_spaces.sql). When it refuses a save, this
 * brings `doc` back in line with `latest`, the copy the database holds:
 * removed cards come back (with my vote on them, since removing a card is how
 * the last person agrees), and votes the database never saw from anyone but
 * me are dropped. Everything else I changed is kept.
 */
export function keepUnagreedCards(doc: BoardDocument, latest: BoardDocument, myId: string): BoardDocument {
  const latestById = new Map(latest.cards.map((c) => [c.id, c]));
  const cards: CardData[] = doc.cards.map((c) => {
    const r = c.rejection;
    if (!r) return c;
    const theirs = latestById.get(c.id)?.rejection;
    if (theirs && theirs.id === r.id) {
      const allowed = new Set([...theirs.approvals, myId]);
      const approvals = r.approvals.filter((a) => allowed.has(a));
      return approvals.length === r.approvals.length ? c : { ...c, rejection: { ...r, approvals } };
    }
    // A proposal the database has not seen may carry only my own vote.
    const approvals = r.approvals.filter((a) => a === myId);
    if (approvals.length) return approvals.length === r.approvals.length ? c : { ...c, rejection: { ...r, approvals } };
    const { rejection: _r, ...rest } = c;
    return theirs ? { ...rest, rejection: theirs } : rest;
  });

  const kept = new Set(cards.map((c) => c.id));
  const clusterIds = new Set(doc.clusters.map((c) => c.id));
  const restored = latest.cards
    .filter((c) => !kept.has(c.id))
    .map((c) => {
      const out = c.clusterId && !clusterIds.has(c.clusterId) ? { ...c, clusterId: null } : c;
      return out.rejection
        ? { ...out, rejection: { ...out.rejection, approvals: [...new Set([...out.rejection.approvals, myId])] } }
        : out;
    });
  if (!restored.length && cards.every((c, i) => c === doc.cards[i])) return doc;

  const all = [...cards, ...restored];
  const ids = new Set([...clusterIds, ...all.map((c) => c.id)]);
  const connIds = new Set(doc.connections.map((c) => c.id));
  const connections = [
    ...doc.connections,
    ...latest.connections.filter((c) => !connIds.has(c.id) && ids.has(c.fromId) && ids.has(c.toId) && (!kept.has(c.fromId) || !kept.has(c.toId))),
  ];
  return { ...doc, cards: all, connections };
}

/**
 * Removes cards everyone has agreed to reject. Needed after a merge: when the
 * last two people agree at the same time, neither copy removed the card, but
 * the merged votes cover everyone.
 */
export function dropAgreedCards(doc: BoardDocument, people: { userId: string }[]): BoardDocument {
  const gone = new Set(doc.cards.filter((c) => rejectionAgreed(c, people)).map((c) => c.id));
  if (!gone.size) return doc;
  return {
    ...doc,
    cards: doc.cards.filter((c) => !gone.has(c.id)),
    connections: doc.connections.filter((c) => !gone.has(c.fromId) && !gone.has(c.toId)),
  };
}

/** True once everyone with access has agreed to reject the card. */
export function rejectionAgreed(card: CardData, people: { userId: string }[]): boolean {
  const r = card.rejection;
  return Boolean(r && people.length > 0 && people.every((p) => r.approvals.includes(p.userId)));
}
