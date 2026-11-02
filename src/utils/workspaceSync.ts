import type { BoardDocument, Viewport, WorkspaceData } from '../types';
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
    updatedAt: Math.max(mine.updatedAt, theirs.updatedAt),
    clusters,
    cards: cards.map((c) => (c.clusterId && !clusters.some((cl) => cl.id === c.clusterId) ? { ...c, clusterId: null } : c)),
    connections,
  };
}
