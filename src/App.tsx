import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  WorkspaceData,
  BoardDocument,
  CardData,
  Cluster,
  CardType,
  CardColor
} from './types';
import {
  INITIAL_DOCUMENTS,
  createStarterWorkspace,
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
import { Plus } from 'lucide-react';

export type SaveState = 'saved' | 'saving' | 'error';

/** Debounce before an edit is written to the database. */
const SAVE_DELAY_MS = 600;
const SAVE_RETRY_MS = 5000;

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

  const [viewMode, setViewMode] = useState<'canvas' | 'feed'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'feed' : 'canvas';
  });

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<CardType>('todo');
  const [quickAddClusterId, setQuickAddClusterId] = useState<string | null>(null);

  // undefined = auth state not known yet, null = signed out.
  const [user, setUser] = useState<AuthUser | null | undefined>(
    UI_PREVIEW ? (new URLSearchParams(window.location.search).has('signin') ? null : PREVIEW_USER) : isCloudConfigured ? undefined : null,
  );
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  // The database is the source of truth. `lastSavedRef` holds the JSON of the
  // copy the database has (null while nothing is loaded), so only real
  // changes are written.
  const workspaceRef = useRef(workspace);
  const lastSavedRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

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

  // Load the account's workspace. A brand-new account starts from whatever was
  // kept in this browser before accounts existed, or from the starter spaces.
  useEffect(() => {
    setLoaded(false);
    setLoadError(null);
    lastSavedRef.current = null;
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
      const res = await fetchCloudWorkspace();
      if (cancelled) return;
      if (res.error) {
        setLoadError(res.error);
        return;
      }
      let ws = res.data;
      if (!ws) {
        ws = readLegacyLocalWorkspace() ?? createStarterWorkspace();
        const created = await saveCloudWorkspace(ws);
        if (cancelled) return;
        if (!created.success) {
          setLoadError(created.error ?? 'Could not create your workspace. Please try again.');
          return;
        }
        clearLegacyLocalWorkspace();
      }
      lastSavedRef.current = JSON.stringify(ws);
      setWorkspace(ws);
      setSaveState('saved');
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  /** Writes the latest workspace to the database, one request at a time. */
  const flushSave = useCallback(async function flush(): Promise<void> {
    if (UI_PREVIEW) return;
    if (savingRef.current || lastSavedRef.current === null) return;
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
    const res = await saveCloudWorkspace(snapshot);
    savingRef.current = false;
    if (lastSavedRef.current === null) return; // Signed out meanwhile.
    if (!res.success) {
      setSaveState('error');
      retryTimerRef.current = setTimeout(() => void flush(), SAVE_RETRY_MS);
      return;
    }
    lastSavedRef.current = json;
    // Edits made while the request was in flight go out right away.
    if (JSON.stringify(workspaceRef.current) !== json) await flush();
    else setSaveState('saved');
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

    const onVisibility = async () => {
      if (document.visibilityState === 'hidden') {
        void flushSave();
        return;
      }
      if (isDirty()) return;
      const res = await fetchCloudWorkspace();
      if (!res.data || isDirty() || lastSavedRef.current === null) return;
      const json = JSON.stringify(res.data);
      if (json === lastSavedRef.current) return;
      lastSavedRef.current = json;
      setWorkspace(res.data);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      void flushSave();
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [loaded, flushSave]);

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

  const handleDeleteCard = (id: string) => {
    updateActiveDocument((doc) => ({
      ...doc,
      cards: doc.cards.filter((c) => c.id !== id),
      connections: doc.connections.filter((conn) => conn.fromId !== id && conn.toId !== id),
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

  const toggleTheme = () => setWorkspace((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  const anyModalOpen = templatesModalOpen || accountModalOpen || commandPaletteOpen || quickAddOpen || recoveryOpen;

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
        onDuplicateDocument={(id) => {
          const doc = workspace.documents.find((d) => d.id === id);
          if (!doc) return;
          const dup: BoardDocument = {
            ...doc,
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        onDeleteDocument={(id) => {
          if (workspace.documents.length <= 1) return;
          const remaining = workspace.documents.filter((d) => d.id !== id);
          setWorkspace((prev) => ({
            ...prev,
            documents: remaining,
            activeDocId: prev.activeDocId === id ? remaining[0].id : prev.activeDocId,
          }));
        }}
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
        />

        <main className="flex-1 w-full h-full relative overflow-hidden">
          {viewMode === 'feed' ? (
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
        onToggleViewMode={() => setViewMode(viewMode === 'feed' ? 'canvas' : 'feed')}
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
                setWorkspace(restored);
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
