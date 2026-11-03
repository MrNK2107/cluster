import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  WorkspaceData,
  BoardDocument,
  CardData,
  Cluster,
  CardType,
  CardColor,
  SpacePerson,
} from './types';
import {
  INITIAL_DOCUMENTS,
  createStarterWorkspace,
  createEmptyWorkspace,
  isOwnerEmail,
  removeUntouchedSamples,
  readLegacyLocalWorkspace,
  clearLegacyLocalWorkspace,
  exportWorkspaceJSON
} from './utils/storage';
import {
  subscribeToAuth,
  signOut,
  fetchCloudWorkspace,
  saveCloudWorkspace,
  isCloudConfigured,
  type AuthUser,
} from './utils/supabase';
import { sanitizeWorkspace } from './utils/validate';
import {
  addMember,
  createSharedSpace,
  deleteSharedSpace,
  fetchSharedSpace,
  fetchSharedSpaces,
  removeMember,
  saveSharedSpace,
  sharedDocId,
  sharedPayload,
  type Person,
} from './utils/sharing';
import { dropAgreedCards, keepUnagreedCards, mergeDocs, mergeWorkspace, rejectionAgreed, splitWorkspace } from './utils/workspaceSync';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { MobileFeedView } from './components/MobileFeedView';
import { MobileQuickAddSheet } from './components/MobileQuickAddSheet';
import { TemplatesModal } from './components/TemplatesModal';
import { AccountModal, SetPasswordDialog } from './components/AccountModal';
import { CanvasDock, CARD_KINDS } from './components/CanvasDock';
import { AuthScreen, WorkspaceLoading } from './components/AuthScreen';
import { CommandPalette } from './components/CommandPalette';
import { MiniMap } from './components/MiniMap';
import { ShareDialog } from './components/ShareDialog';
import { TableView } from './components/TableView';
import { Plus } from 'lucide-react';

export type SaveState = 'saved' | 'saving' | 'error';

export type ViewMode = 'canvas' | 'feed' | 'table';
const VIEW_PREFS_KEY = 'clustr_view_by_space';
/** Spaces with more cards than this open in the table view by default. */
const TABLE_BY_DEFAULT_ABOVE = 30;

function readViewPrefs(): Record<string, ViewMode> {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEW_PREFS_KEY) ?? '{}');
    const out: Record<string, ViewMode> = {};
    for (const [k, v] of Object.entries(raw ?? {})) if (v === 'canvas' || v === 'feed' || v === 'table') out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** Debounce before an edit is written to the database. */
const SAVE_DELAY_MS = 600;
const SAVE_RETRY_MS = 5000;
/** How often an open shared space checks for other people's edits. */
const SHARED_POLL_MS = 8000;

/**
 * Local UI preview: `VITE_UI_PREVIEW=1 npm run dev` skips sign-in and keeps
 * edits in memory, so the interface can be worked on without an account.
 * Only ever active in the dev server.
 */
const UI_PREVIEW = import.meta.env.DEV && import.meta.env.VITE_UI_PREVIEW === '1';
const PREVIEW_USER: AuthUser = { id: 'preview', email: 'preview@clustr.local', name: 'Preview', avatarUrl: null };

const DEFAULT_TITLES: Record<CardType, string> = {
  todo: 'To-do',
  note: 'Note',
  sticky: '',
  counter: 'Tally',
  links: 'Links',
};

const DEFAULT_COLORS: Record<CardType, CardColor> = {
  todo: 'blue',
  note: 'green',
  sticky: 'yellow',
  counter: 'pink',
  links: 'purple',
};

function makeCard(type: CardType, fields: Partial<CardData>): CardData {
  const now = Date.now();
  return {
    id: `card-${now}-${Math.random().toString(36).slice(2, 6)}`,
    clusterId: null,
    type,
    title: DEFAULT_TITLES[type],
    x: 100,
    y: 100,
    color: DEFAULT_COLORS[type],
    tags: [],
    todos: type === 'todo' ? [] : undefined,
    noteContent: type === 'note' || type === 'sticky' ? '' : undefined,
    counterValue: type === 'counter' ? 0 : undefined,
    counterLabel: type === 'counter' ? '' : undefined,
    bookmarks: type === 'links' ? [] : undefined,
    ...fields,
    createdAt: now,
    updatedAt: now,
  };
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceData>(createStarterWorkspace);

  // The view each space was last shown in, remembered in this browser.
  const [viewPrefs, setViewPrefs] = useState<Record<string, ViewMode>>(readViewPrefs);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<CardType>('todo');
  const [quickAddClusterId, setQuickAddClusterId] = useState<string | null>(null);

  // undefined = auth state not known yet, null = signed out.
  const [user, setUser] = useState<AuthUser | null | undefined>(
    UI_PREVIEW ? (new URLSearchParams(window.location.search).has('signin') ? null : PREVIEW_USER) : isCloudConfigured ? undefined : null,
  );
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  // The database is the source of truth. `lastSavedRef` holds the JSON of the
  // workspace as the database has it (null while nothing is loaded), so only
  // real changes are written. The account row and each shared space are
  // tracked separately so a save only writes the parts that changed.
  const workspaceRef = useRef(workspace);
  const userIdRef = useRef(userId);
  const lastSavedRef = useRef<string | null>(null);
  const lastPersonalRef = useRef<string | null>(null);
  const lastSharedRef = useRef(new Map<string, BoardDocument>());
  const savingRef = useRef(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  /** Records `ws` as exactly what the database holds. */
  const markSaved = useCallback((ws: WorkspaceData) => {
    const { personal, shared } = splitWorkspace(ws);
    lastSavedRef.current = JSON.stringify(ws);
    lastPersonalRef.current = JSON.stringify(personal);
    lastSharedRef.current = new Map(shared);
  }, []);

  // Track the signed-in account.
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    if (UI_PREVIEW) return;
    void subscribeToAuth(setUser, () => setRecoveryOpen(true)).then((unsub) => {
      if (active) unsubscribe = unsub;
      else unsub();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Load the account's workspace and the spaces shared with it. A brand-new
  // account starts from whatever was kept in this browser before accounts
  // existed (owner only), or from one empty space.
  useEffect(() => {
    setLoaded(false);
    setLoadError(null);
    lastSavedRef.current = null;
    lastPersonalRef.current = null;
    lastSharedRef.current = new Map();
    setShareDocId(null);
    if (!userId) {
      setWorkspace(createStarterWorkspace());
      return;
    }
    if (UI_PREVIEW) {
      setWorkspace(createStarterWorkspace());
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [res, sharedRes] = await Promise.all([fetchCloudWorkspace(), fetchSharedSpaces()]);
      if (cancelled) return;
      if (res.error || sharedRes.error) {
        setLoadError(res.error ?? sharedRes.error ?? null);
        return;
      }
      let personal = res.data;
      const owner = isOwnerEmail(userEmail);
      if (!personal) {
        // Data kept in this browser before accounts existed is the owner's;
        // every other new account starts empty.
        const legacy = owner ? readLegacyLocalWorkspace() : null;
        personal = legacy ?? createEmptyWorkspace();
        const created = await saveCloudWorkspace(personal);
        if (cancelled) return;
        if (!created.success) {
          setLoadError(created.error ?? 'Could not create your workspace. Please try again.');
          return;
        }
        if (legacy) clearLegacyLocalWorkspace();
      } else if (!owner && personal.documents.length > 0) {
        const cleaned = removeUntouchedSamples(personal);
        if (cleaned) {
          const saved = await saveCloudWorkspace(cleaned);
          if (cancelled) return;
          if (saved.success) personal = cleaned;
        }
      }
      let ws = mergeWorkspace(personal, sharedRes.data);
      if (ws.documents.length === 0) {
        // Every space was shared and has since gone: start a fresh one.
        const empty = createEmptyWorkspace();
        personal = { ...personal, documents: empty.documents, activeDocId: empty.activeDocId };
        const saved = await saveCloudWorkspace(personal);
        if (cancelled) return;
        if (!saved.success) {
          setLoadError(saved.error ?? 'Could not create your workspace. Please try again.');
          return;
        }
        ws = mergeWorkspace(personal, sharedRes.data);
      }
      markSaved(ws);
      setWorkspace(ws);
      setSaveState('saved');
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, reloadKey, markSaved]);

  /** Writes the latest workspace to the database, one request at a time. */
  const flushSave = useCallback(async function flush(): Promise<void> {
    if (UI_PREVIEW) return;
    if (lastSavedRef.current === null) return;
    // Callers that need the data saved (sign-out) wait for the running save,
    // which also writes any edits made while it was in flight.
    if (savingRef.current) return savePromiseRef.current ?? undefined;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const snapshot = workspaceRef.current;
    const json = JSON.stringify(snapshot);
    if (json === lastSavedRef.current) {
      setSaveState('saved');
      return;
    }
    savingRef.current = true;
    setSaveState('saving');
    const done = (async () => {
      const { personal, shared } = splitWorkspace(snapshot);
      let ok = true;

      const personalJson = JSON.stringify(personal);
      if (personalJson !== lastPersonalRef.current) {
        const res = await saveCloudWorkspace(personal);
        if (res.success) lastPersonalRef.current = personalJson;
        else ok = false;
      }

      // Shared spaces: fold in edits other people saved since we last synced.
      const merged = new Map<string, { sent: BoardDocument; saved: BoardDocument }>();
      const gone: string[] = [];
      for (const [spaceId, doc] of shared) {
        const base = lastSharedRef.current.get(spaceId);
        if (base && JSON.stringify(base) === JSON.stringify(doc)) continue;
        const latest = await fetchSharedSpace(spaceId);
        if (latest.error) {
          ok = false;
          continue;
        }
        if (!latest.doc) {
          gone.push(spaceId); // Deleted, or no longer shared with this account.
          continue;
        }
        const theirs = sharedPayload(latest.doc);
        let toWrite = base && JSON.stringify(theirs) !== JSON.stringify(base) ? mergeDocs(base, doc, theirs) : doc;
        const people = snapshot.documents.find((d) => d.share?.spaceId === spaceId)?.share?.people ?? [];
        if (toWrite !== doc && people.length > 1) toWrite = dropAgreedCards(toWrite, people);
        let res = await saveSharedSpace(spaceId, toWrite);
        const myId = userIdRef.current;
        if (res.refused && myId) {
          // Someone joined since we loaded, or another save got in first: the
          // database keeps cards not everyone has agreed to remove. Put them
          // back (with this person's vote) and save the rest.
          const fixed = keepUnagreedCards(toWrite, theirs, myId);
          if (fixed !== toWrite) {
            toWrite = fixed;
            res = await saveSharedSpace(spaceId, toWrite);
          }
        }
        if (!res.success) {
          ok = false;
          continue;
        }
        const savedDoc = sharedPayload(toWrite);
        lastSharedRef.current.set(spaceId, savedDoc);
        if (toWrite !== doc) merged.set(spaceId, { sent: doc, saved: savedDoc });
      }

      savingRef.current = false;
      if (lastSavedRef.current === null) return; // Signed out meanwhile.

      if (merged.size || gone.length) {
        // Show what others added, keeping anything typed since the snapshot.
        gone.forEach((id) => lastSharedRef.current.delete(id));
        setWorkspace((prev) => {
          let documents = prev.documents
            .filter((d) => !(d.share && gone.includes(d.share.spaceId)))
            .map((d) => {
              const m = d.share && merged.get(d.share.spaceId);
              if (!m) return d;
              const current = sharedPayload(d);
              const next = JSON.stringify(current) === JSON.stringify(m.sent) ? m.saved : mergeDocs(m.sent, current, m.saved);
              return { ...next, id: d.id, viewport: d.viewport, share: d.share };
            });
          if (documents.length === 0) documents = createEmptyWorkspace().documents;
          const activeDocId = documents.some((d) => d.id === prev.activeDocId) ? prev.activeDocId : documents[0].id;
          return { ...prev, documents, activeDocId };
        });
      }

      if (!ok) {
        setSaveState('error');
        retryTimerRef.current = setTimeout(() => void flush(), SAVE_RETRY_MS);
        return;
      }
      lastSavedRef.current = json;
      // Edits made while the request was in flight go out right away.
      if (JSON.stringify(workspaceRef.current) !== json) await flush();
      else setSaveState('saved');
    })();
    savePromiseRef.current = done;
    return done;
  }, []);

  // Every change is saved shortly after it is made.
  useEffect(() => {
    if (UI_PREVIEW || !loaded || JSON.stringify(workspace) === lastSavedRef.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [workspace, loaded, flushSave]);

  // Save when the tab is hidden, pick up edits made on other devices when it
  // comes back, and warn before closing with unsaved changes.
  useEffect(() => {
    if (UI_PREVIEW || !loaded) return;
    const isDirty = () => savingRef.current || JSON.stringify(workspaceRef.current) !== lastSavedRef.current;

    const pullLatest = async () => {
      if (isDirty()) return;
      const [res, sharedRes] = await Promise.all([fetchCloudWorkspace(), fetchSharedSpaces()]);
      if (!res.data || sharedRes.error || isDirty() || lastSavedRef.current === null) return;
      const latest = mergeWorkspace(res.data, sharedRes.data);
      if (latest.documents.length === 0) return;
      if (JSON.stringify(latest) === lastSavedRef.current) return;
      markSaved(latest);
      setWorkspace(latest);
    };
    const onVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        void flushSave();
        return;
      }
      await pullLatest();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      void flushSave();
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    // While a shared space is open, check for other people's edits.
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && workspaceRef.current.documents.some((d) => d.share)) void pullLatest();
    }, SHARED_POLL_MS);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [loaded, flushSave, markSaved]);

  const handleSignOut = async () => {
    await flushSave();
    lastSavedRef.current = null;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    await signOut();
  };

  // Global keydown for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply the Dark/Light theme class
  useEffect(() => {
    if (workspace.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [workspace.theme]);

  // Active document
  const activeDocument = useMemo(() => {
    return (
      workspace.documents.find((d) => d.id === workspace.activeDocId) ||
      workspace.documents[0] ||
      INITIAL_DOCUMENTS[0]
    );
  }, [workspace.documents, workspace.activeDocId]);

  // Spaces with many entries open as a table unless the person chose otherwise.
  const viewMode: ViewMode =
    viewPrefs[activeDocument.id] ??
    (activeDocument.cards.length > TABLE_BY_DEFAULT_ABOVE
      ? 'table'
      : typeof window !== 'undefined' && window.innerWidth < 768
        ? 'feed'
        : 'canvas');
  const setViewMode = (mode: ViewMode) => {
    setViewPrefs((prev) => {
      const next = { ...prev, [activeDocument.id]: mode };
      try {
        localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(next));
      } catch {
        // Not remembered; still applies now.
      }
      return next;
    });
  };

  // Unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeDocument.cards.forEach((c) => {
      c.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [activeDocument.cards]);

  const updateActiveDocument = (updater: (doc: BoardDocument) => BoardDocument) => {
    setWorkspace((prev) => {
      const updatedDocs = prev.documents.map((doc) => {
        if (doc.id === activeDocument.id) {
          return updater({ ...doc, updatedAt: Date.now() });
        }
        return doc;
      });
      return {
        ...prev,
        documents: updatedDocs,
      };
    });
  };

  // Card Handlers
  const handleAddCardAt = (type: CardType, x: number, y: number, extra: Partial<CardData> = {}) => {
    const newCard = makeCard(type, { x, y, ...extra });
    updateActiveDocument((doc) => ({
      ...doc,
      cards: [...doc.cards, newCard],
    }));
  };

  const handleAddCard = (type: CardType) => {
    const vp = activeDocument.viewport;
    // Centre of the visible canvas, nudged so repeated adds don't stack exactly.
    const main = document.querySelector('main')?.getBoundingClientRect();
    const w = main?.width ?? window.innerWidth;
    const h = main?.height ?? window.innerHeight;
    const jitter = (activeDocument.cards.length % 5) * 24;
    handleAddCardAt(
      type,
      Math.round((w / 2 - vp.x) / vp.zoom - 160 + jitter),
      Math.round((h / 2 - vp.y) / vp.zoom - 120 + jitter),
    );
  };

  const handleAddCardInsideCluster = (clusterId: string, type: CardType) => {
    const cluster = activeDocument.clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    const clusterCards = activeDocument.cards.filter((c) => c.clusterId === clusterId);
    const cardY = cluster.y + 60 + clusterCards.length * 90;

    const newCard = makeCard(type, { clusterId, x: cluster.x + 20, y: cardY, color: cluster.color });

    updateActiveDocument((doc) => ({
      ...doc,
      cards: [...doc.cards, newCard],
    }));
  };

  const handleAddCardFromQuickSheet = (params: {
    type: CardType;
    title: string;
    content: string;
    clusterId: string | null;
    color: CardColor;
  }) => {
    const cluster = activeDocument.clusters.find((c) => c.id === params.clusterId);
    const inCluster = activeDocument.cards.filter((c) => c.clusterId === params.clusterId).length;
    const tags = params.type === 'todo' ? Array.from(new Set(params.content.match(/#[\p{L}\p{N}_-]+/gu) ?? [])) : [];
    const newCard = makeCard(params.type, {
      clusterId: params.clusterId,
      title: params.title,
      x: cluster ? cluster.x + 20 : 100 + (activeDocument.cards.length % 6) * 30,
      y: cluster ? cluster.y + 60 + inCluster * 90 : 100 + (activeDocument.cards.length % 6) * 30,
      color: params.color,
      tags,
      todos: params.type === 'todo' && params.content ? [{ id: `t-${Date.now()}`, text: params.content, completed: false, priority: 'medium' }] : params.type === 'todo' ? [] : undefined,
      noteContent: params.type === 'note' || params.type === 'sticky' ? params.content : undefined,
    });

    updateActiveDocument((doc) => ({
      ...doc,
      cards: [...doc.cards, newCard],
    }));
  };

  const handleUpdateCard = (id: string, updated: Partial<CardData>) => {
    updateActiveDocument((doc) => ({
      ...doc,
      cards: doc.cards.map((c) => (c.id === id ? { ...c, ...updated, updatedAt: Date.now() } : c)),
    }));
  };

  const removeCard = (doc: BoardDocument, id: string): BoardDocument => ({
    ...doc,
    cards: doc.cards.filter((c) => c.id !== id),
    connections: doc.connections.filter((conn) => conn.fromId !== id && conn.toId !== id),
  });

  /** People who must agree before a card in the open space is deleted. */
  const votingPeople = (doc: BoardDocument) => (doc.share && doc.share.people.length > 1 ? doc.share.people : null);

  /**
   * Deletes a card. In a space shared with others it instead proposes
   * rejecting it; the card goes once everyone has agreed.
   */
  const handleDeleteCard = (id: string) => {
    if (!votingPeople(activeDocument) || !user) {
      updateActiveDocument((doc) => removeCard(doc, id));
      return;
    }
    const me = user;
    updateActiveDocument((doc) => {
      const card = doc.cards.find((c) => c.id === id);
      if (!card || card.rejection) return doc;
      const rejection = {
        id: `rj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        byId: me.id,
        byEmail: me.email ?? '',
        at: Date.now(),
        approvals: [me.id],
      };
      return { ...doc, cards: doc.cards.map((c) => (c.id === id ? { ...c, rejection, updatedAt: Date.now() } : c)) };
    });
  };

  /** True when the open space is shared and this person owns it: they may delete without a vote. */
  const ownsSharedSpace = (doc: BoardDocument) => Boolean(doc.share?.isOwner && user && doc.share.ownerId === user.id);

  /** Owner only: deletes a card in their shared space straight away, pending vote or not. */
  const handleDeleteCardNow = (id: string) => {
    if (votingPeople(activeDocument) && !ownsSharedSpace(activeDocument)) return;
    updateActiveDocument((doc) => removeCard(doc, id));
  };

  const handleAgreeReject = (id: string) => {
    if (!user) return;
    const me = user.id;
    updateActiveDocument((doc) => {
      const card = doc.cards.find((c) => c.id === id);
      if (!card?.rejection) return doc;
      const agreed = { ...card, rejection: { ...card.rejection, approvals: [...new Set([...card.rejection.approvals, me])] } };
      const people = votingPeople(doc);
      if (!people || rejectionAgreed(agreed, people)) return removeCard(doc, id);
      return { ...doc, cards: doc.cards.map((c) => (c.id === id ? { ...agreed, updatedAt: Date.now() } : c)) };
    });
  };

  /** Declines a proposal (or the proposer withdraws it): the card stays. */
  const handleKeepCard = (id: string) => {
    updateActiveDocument((doc) => ({
      ...doc,
      cards: doc.cards.map((c) => {
        if (c.id !== id || !c.rejection) return c;
        const { rejection: _r, ...rest } = c;
        return { ...rest, updatedAt: Date.now() };
      }),
    }));
  };

  const handleDuplicateCard = (id: string) => {
    const card = activeDocument.cards.find((c) => c.id === id);
    if (!card) return;

    const duplicated: CardData = {
      ...card,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${card.title} copy`,
      x: card.x + 30,
      y: card.y + 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateActiveDocument((doc) => ({
      ...doc,
      cards: [...doc.cards, duplicated],
    }));
  };

  // Cluster Handlers
  const handleAddCluster = () => {
    const vp = activeDocument.viewport;
    const spawnX = Math.round((-vp.x + 200) / vp.zoom);
    const spawnY = Math.round((-vp.y + 150) / vp.zoom);

    const newCluster: Cluster = {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: 'New cluster',
      color: (['blue', 'green', 'yellow', 'pink', 'amber', 'purple'] as const)[activeDocument.clusters.length % 6],
      x: Math.max(40, spawnX),
      y: Math.max(40, spawnY),
      width: 380,
      height: 480,
      createdAt: Date.now(),
    };

    updateActiveDocument((doc) => ({
      ...doc,
      clusters: [...doc.clusters, newCluster],
    }));
  };

  const handleUpdateCluster = (id: string, updated: Partial<Cluster>) => {
    updateActiveDocument((doc) => ({
      ...doc,
      clusters: doc.clusters.map((cl) => (cl.id === id ? { ...cl, ...updated } : cl)),
    }));
  };

  const handleDeleteCluster = (id: string) => {
    updateActiveDocument((doc) => ({
      ...doc,
      clusters: doc.clusters.filter((cl) => cl.id !== id),
      cards: doc.cards.map((c) => (c.clusterId === id ? { ...c, clusterId: null } : c)),
      connections: doc.connections.filter((conn) => conn.fromId !== id && conn.toId !== id),
    }));
  };

  // Connection Handlers
  const handleDeleteConnection = (connId: string) => {
    updateActiveDocument((doc) => ({
      ...doc,
      connections: doc.connections.filter((conn) => conn.id !== connId),
    }));
  };

  // Viewport / Zoom / Pan
  const handleUpdateViewport = (vp: { x: number; y: number; zoom: number }) => {
    updateActiveDocument((doc) => ({
      ...doc,
      viewport: vp,
    }));
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(activeDocument.viewport.zoom + delta, 0.3), 2.5);
    handleUpdateViewport({
      ...activeDocument.viewport,
      zoom: newZoom,
    });
  };

  const handleResetZoom = () => {
    handleUpdateViewport({
      x: 80,
      y: 80,
      zoom: 1,
    });
  };

  const handlePanTo = (newX: number, newY: number) => {
    handleUpdateViewport({
      ...activeDocument.viewport,
      x: newX,
      y: newY,
    });
  };

  const handleFocusCard = (cardId: string) => {
    const card = activeDocument.cards.find((c) => c.id === cardId);
    if (!card) return;
    // Cards in a cluster are stacked by the cluster; aim at the cluster instead.
    const cluster = activeDocument.clusters.find((cl) => cl.id === card.clusterId);
    const x = cluster ? cluster.x + 20 : card.x;
    const y = cluster ? cluster.y : card.y;
    const zoom = activeDocument.viewport.zoom;
    const main = document.querySelector('main')?.getBoundingClientRect();
    handlePanTo(-(x * zoom - (main?.width ?? window.innerWidth) / 2 + 160), -(y * zoom - 80));
  };

  // Sharing ----------------------------------------------------------------

  const newDocId = () => `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const withoutShare = (doc: BoardDocument): BoardDocument => {
    const { share: _share, ...rest } = doc;
    return rest;
  };

  /** Takes a space out of this account's view; the last one is replaced by an empty space. */
  const removeDocLocally = (id: string) => {
    setWorkspace((prev) => {
      let documents = prev.documents.filter((d) => d.id !== id);
      if (documents.length === 0) documents = createEmptyWorkspace().documents;
      const activeDocId = documents.some((d) => d.id === prev.activeDocId) ? prev.activeDocId : documents[0].id;
      return { ...prev, documents, activeDocId };
    });
  };

  const setPeople = (docId: string, update: (people: SpacePerson[]) => SpacePerson[]) =>
    setWorkspace((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === docId && d.share ? { ...d, share: { ...d.share, people: update(d.share.people) } } : d)),
    }));

  const findDoc = (id: string | null) => (id ? workspaceRef.current.documents.find((d) => d.id === id) : undefined);

  const handleAddPerson = async (person: Person): Promise<string | null> => {
    const doc = findDoc(shareDocId);
    if (!doc || !user) return 'This space no longer exists.';
    if (doc.share) {
      const res = await addMember(doc.share.spaceId, person);
      if (!res.success) return res.error ?? 'Could not add them. Please try again.';
      setPeople(doc.id, (people) =>
        people.some((p) => p.userId === person.id) ? people : [...people, { userId: person.id, email: person.email }],
      );
      return null;
    }
    // First person added: the space moves out of the account row into a shared one.
    const created = await createSharedSpace(doc);
    if (!created.spaceId) return created.error ?? 'Could not share this space. Please try again.';
    const spaceId = created.spaceId;
    const added = await addMember(spaceId, person);
    const id = sharedDocId(spaceId);
    const ownerEmail = user.email ?? '';
    const share = {
      spaceId,
      ownerId: user.id,
      ownerEmail,
      isOwner: true,
      people: [{ userId: user.id, email: ownerEmail }, ...(added.success ? [{ userId: person.id, email: person.email }] : [])],
    };
    lastSharedRef.current.set(spaceId, sharedPayload({ ...doc, id }));
    setWorkspace((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === doc.id ? { ...d, id, share } : d)),
      activeDocId: prev.activeDocId === doc.id ? id : prev.activeDocId,
    }));
    setShareDocId(id);
    return added.success ? null : (added.error ?? 'The space is shared, but adding them failed. Please try again.');
  };

  const handleRemovePerson = async (memberId: string): Promise<string | null> => {
    const doc = findDoc(shareDocId);
    if (!doc?.share) return null;
    const res = await removeMember(doc.share.spaceId, memberId);
    if (!res.success) return res.error ?? 'Could not remove them. Please try again.';
    setPeople(doc.id, (people) => people.filter((p) => p.userId !== memberId));
    return null;
  };

  const handleStopSharing = async (): Promise<string | null> => {
    const doc = findDoc(shareDocId);
    if (!doc?.share) return null;
    if (doc.protected) return 'This space is protected, so it stays shared. You can still remove people.';
    // Keep the owner's latest content as an ordinary space first, so nothing is lost.
    const spaceId = doc.share.spaceId;
    const id = newDocId();
    setWorkspace((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === doc.id ? { ...withoutShare(d), id } : d)),
      activeDocId: prev.activeDocId === doc.id ? id : prev.activeDocId,
    }));
    const res = await deleteSharedSpace(spaceId);
    lastSharedRef.current.delete(spaceId);
    setShareDocId(null);
    return res.success ? null : (res.error ?? 'Could not stop sharing. Please try again.');
  };

  const handleLeave = async (): Promise<string | null> => {
    const doc = findDoc(shareDocId);
    if (!doc?.share || !user) return null;
    const res = await removeMember(doc.share.spaceId, user.id);
    if (!res.success) return res.error ?? 'Could not leave the space. Please try again.';
    lastSharedRef.current.delete(doc.share.spaceId);
    removeDocLocally(doc.id);
    setShareDocId(null);
    return null;
  };

  const handleDeleteDocument = async (id: string) => {
    const doc = findDoc(id);
    if (!doc) return;
    // Nobody deletes a protected space; people it was shared with may still leave it.
    if (doc.protected && !(doc.share && !doc.share.isOwner)) return;
    if (doc.share && user) {
      const res = doc.share.isOwner ? await deleteSharedSpace(doc.share.spaceId) : await removeMember(doc.share.spaceId, user.id);
      if (!res.success) {
        window.alert(res.error ?? 'Could not remove this space. Please try again.');
        return;
      }
      lastSharedRef.current.delete(doc.share.spaceId);
      removeDocLocally(id);
      return;
    }
    if (workspaceRef.current.documents.length <= 1) return;
    removeDocLocally(id);
  };

  const shareDoc = shareDocId ? workspace.documents.find((d) => d.id === shareDocId) : undefined;

  const toggleTheme = () => setWorkspace((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  const anyModalOpen = shareDocId !== null || templatesModalOpen || accountModalOpen || commandPaletteOpen || quickAddOpen || recoveryOpen;

  // Single-key shortcuts for adding things to the canvas.
  const shortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    shortcutRef.current = (e: KeyboardEvent) => {
    if (!loaded || anyModalOpen || viewMode !== 'canvas' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    const key = e.key.toUpperCase();
    if (key === 'C') {
      e.preventDefault();
      handleAddCluster();
      return;
    }
    const kind = CARD_KINDS.find((k) => k.key === key);
    if (kind) {
      e.preventDefault();
      handleAddCard(kind.type);
    }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => shortcutRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (user === undefined) return <WorkspaceLoading />;
  if (!user) return <AuthScreen />;
  if (!loaded) {
    return (
      <WorkspaceLoading
        error={loadError}
        onRetry={() => setReloadKey((k) => k + 1)}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  const openQuickAdd = (type: CardType, clusterId?: string | null) => {
    setQuickAddType(type);
    setQuickAddClusterId(clusterId ?? null);
    setQuickAddOpen(true);
  };

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-ink-100 dark:bg-ink-950 text-ink-800 dark:text-ink-100 font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        documents={workspace.documents}
        activeDocId={workspace.activeDocId}
        user={user}
        onSelectDocument={(id) => setWorkspace((prev) => ({ ...prev, activeDocId: id }))}
        onCreateDocument={() => setTemplatesModalOpen(true)}
        onShareDocument={setShareDocId}
        onDuplicateDocument={(id) => {
          const doc = workspace.documents.find((d) => d.id === id);
          if (!doc) return;
          // A copy is an ordinary space: it is not shared and not protected.
          const { protected: _protected, ...unprotected } = withoutShare(doc);
          const dup: BoardDocument = {
            ...unprotected,
            id: newDocId(),
            title: `${doc.title} copy`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setWorkspace((prev) => ({
            ...prev,
            documents: [...prev.documents, dup],
            activeDocId: dup.id,
          }));
        }}
        onDeleteDocument={(id) => void handleDeleteDocument(id)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenAccount={() => setAccountModalOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <TopBar
          document={activeDocument}
          theme={workspace.theme as 'dark' | 'light'}
          viewMode={viewMode}
          saveState={saveState}
          sidebarOpen={sidebarOpen}
          activeTagFilter={activeTagFilter}
          allTags={allTags}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleTheme={toggleTheme}
          onSetViewMode={setViewMode}
          onSelectTagFilter={setActiveTagFilter}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onUpdateDocTitle={(title) => updateActiveDocument((doc) => ({ ...doc, title }))}
          onShare={() => setShareDocId(activeDocument.id)}
        />

        <main className="flex-1 w-full h-full relative overflow-hidden">
          {viewMode === 'table' ? (
            <TableView
              document={activeDocument}
              myId={user.id}
              activeTagFilter={activeTagFilter}
              onSelectTagFilter={setActiveTagFilter}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onDeleteCardNow={votingPeople(activeDocument) && ownsSharedSpace(activeDocument) ? handleDeleteCardNow : undefined}
              onAgreeReject={handleAgreeReject}
              onKeep={handleKeepCard}
            />
          ) : viewMode === 'feed' ? (
            <MobileFeedView
              document={activeDocument}
              activeTagFilter={activeTagFilter}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onUpdateCluster={handleUpdateCluster}
              onDeleteCluster={handleDeleteCluster}
              onOpenQuickAdd={openQuickAdd}
            />
          ) : (
            <>
              <Canvas
                cards={activeDocument.cards}
                clusters={activeDocument.clusters}
                connections={activeDocument.connections}
                viewport={activeDocument.viewport}
                activeTagFilter={activeTagFilter}
                onUpdateViewport={handleUpdateViewport}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
                onDuplicateCard={handleDuplicateCard}
                onUpdateCluster={handleUpdateCluster}
                onDeleteCluster={handleDeleteCluster}
                onAddCardInsideCluster={handleAddCardInsideCluster}
                onDeleteConnection={handleDeleteConnection}
                voting={
                  votingPeople(activeDocument)
                    ? {
                        myId: user.id,
                        people: activeDocument.share!.people.length,
                        onAgree: handleAgreeReject,
                        onKeep: handleKeepCard,
                        ...(ownsSharedSpace(activeDocument) ? { onDeleteNow: handleDeleteCardNow } : {}),
                      }
                    : undefined
                }
                onCreateAt={(type, x, y) => handleAddCardAt(type, x, y)}
              />
              <CanvasDock onAddCard={handleAddCard} onAddCluster={handleAddCluster} />
              <MiniMap
                cards={activeDocument.cards}
                clusters={activeDocument.clusters}
                viewport={activeDocument.viewport}
                onPanTo={handlePanTo}
                onZoomIn={() => handleZoom(0.15)}
                onZoomOut={() => handleZoom(-0.15)}
                onResetZoom={handleResetZoom}
              />
            </>
          )}

          {/* Phone: one thumb-reachable add button */}
          <button
            type="button"
            onClick={() => openQuickAdd('todo')}
            className="md:hidden fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-2 h-14 pl-5 pr-6 rounded-full bg-brand-600 text-white font-semibold text-[15px] shadow-[0_16px_32px_-12px] shadow-brand-700 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" /> Add
          </button>
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        documents={workspace.documents}
        activeDocument={activeDocument}
        theme={workspace.theme as 'dark' | 'light'}
        viewMode={viewMode}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectDocument={(docId) => setWorkspace((prev) => ({ ...prev, activeDocId: docId }))}
        onAddCard={handleAddCard}
        onAddCluster={handleAddCluster}
        onToggleTheme={toggleTheme}
        onToggleViewMode={() => setViewMode(viewMode === 'canvas' ? 'feed' : 'canvas')}
        onOpenAccount={() => setAccountModalOpen(true)}
        onFocusCard={(id) => {
          setViewMode('canvas');
          handleFocusCard(id);
        }}
      />

      <MobileQuickAddSheet
        isOpen={quickAddOpen}
        initialType={quickAddType}
        initialClusterId={quickAddClusterId}
        clusters={activeDocument.clusters}
        onClose={() => setQuickAddOpen(false)}
        onAdd={handleAddCardFromQuickSheet}
      />

      <AccountModal
        isOpen={accountModalOpen}
        user={user}
        theme={workspace.theme === 'dark' ? 'dark' : 'light'}
        onSetTheme={(theme) => setWorkspace((prev) => ({ ...prev, theme }))}
        onExport={() => exportWorkspaceJSON(workspace)}
        onImport={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const restored = sanitizeWorkspace(JSON.parse(String(e.target?.result ?? '')));
              if (!restored) throw new Error('invalid');
              if (window.confirm('Replace all your spaces with the ones in this backup?')) {
                // Shared spaces are not part of a backup restore; keep them as they are.
                setWorkspace((prev) => {
                  const own = restored.documents.map((d) => (d.id.startsWith('space-') ? { ...d, id: newDocId() } : d));
                  const documents = [...own, ...prev.documents.filter((d) => d.share)];
                  const activeDocId = documents.some((d) => d.id === restored.activeDocId) ? restored.activeDocId : documents[0].id;
                  return { ...restored, documents, activeDocId };
                });
                setAccountModalOpen(false);
              }
            } catch {
              window.alert('That file isn’t a clustr backup. Choose a .json file you downloaded from clustr.');
            }
          };
          reader.readAsText(file);
        }}
        onSignOut={handleSignOut}
        onClose={() => setAccountModalOpen(false)}
      />

      <SetPasswordDialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />

      {shareDoc && (
        <ShareDialog
          key={shareDoc.id}
          open
          doc={shareDoc}
          user={user}
          onClose={() => setShareDocId(null)}
          onAddPerson={handleAddPerson}
          onRemovePerson={handleRemovePerson}
          onStopSharing={handleStopSharing}
          onLeave={handleLeave}
        />
      )}

      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onCreateWithTemplate={(newDoc) => {
          setWorkspace((prev) => ({
            ...prev,
            documents: [newDoc, ...prev.documents],
            activeDocId: newDoc.id,
          }));
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
      />
    </div>
  );
};

export default App;
