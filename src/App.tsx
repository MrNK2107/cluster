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
import { AccountModal } from './components/AccountModal';
import { AuthScreen, WorkspaceLoading } from './components/AuthScreen';
import { CommandPalette } from './components/CommandPalette';
import { MiniMap } from './components/MiniMap';
import { Plus, FileText, Map, LayoutGrid } from 'lucide-react';

export type SaveState = 'saved' | 'saving' | 'error';

/** Debounce before an edit is written to the database. */
const SAVE_DELAY_MS = 600;
const SAVE_RETRY_MS = 5000;

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
  const [user, setUser] = useState<AuthUser | null | undefined>(isCloudConfigured ? undefined : null);
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
    void subscribeToAuth(setUser).then((unsub) => {
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
    if (!loaded || JSON.stringify(workspace) === lastSavedRef.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => void flushSave(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [workspace, loaded, flushSave]);

  // Save when the tab is hidden, pick up edits made on other devices when it
  // comes back, and warn before closing with unsaved changes.
  useEffect(() => {
    if (!loaded) return;
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
  const handleAddCard = (type: CardType) => {
    const vp = activeDocument.viewport;
    const spawnX = Math.round((-vp.x + 300) / vp.zoom);
    const spawnY = Math.round((-vp.y + 200) / vp.zoom);

    const defaultColor: CardColor = type === 'todo' ? 'blue' : type === 'note' ? 'green' : type === 'sticky' ? 'yellow' : 'pink';

    const newCard: CardData = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      clusterId: null,
      type,
      title: type === 'todo' ? 'New Task List' : type === 'note' ? 'Quick Scratchpad' : type === 'sticky' ? 'Sticky Note' : type === 'counter' ? 'Counter' : 'Links',
      x: Math.max(40, spawnX),
      y: Math.max(40, spawnY),
      color: defaultColor,
      tags: [],
      todos: type === 'todo' ? [
        { id: `t-${Date.now()}`, text: 'First task to complete', completed: false, priority: 'medium' }
      ] : undefined,
      noteContent: type === 'note' ? '' : type === 'sticky' ? '' : undefined,
      counterValue: type === 'counter' ? 0 : undefined,
      counterLabel: type === 'counter' ? 'Count' : undefined,
      bookmarks: type === 'links' ? [] : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateActiveDocument((doc) => ({
      ...doc,
      cards: [...doc.cards, newCard],
    }));
  };

  const handleAddCardInsideCluster = (clusterId: string, type: CardType) => {
    const cluster = activeDocument.clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    const clusterCards = activeDocument.cards.filter((c) => c.clusterId === clusterId);
    const cardY = cluster.y + 60 + clusterCards.length * 90;

    const newCard: CardData = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      clusterId,
      type,
      title: type === 'todo' ? 'Checklist' : type === 'note' ? 'Notes' : 'Sticky',
      x: cluster.x + 20,
      y: cardY,
      color: cluster.color,
      tags: [],
      todos: type === 'todo' ? [{ id: `t-${Date.now()}`, text: 'New item', completed: false }] : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

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
    const newCard: CardData = {
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      clusterId: params.clusterId,
      type: params.type,
      title: params.title,
      x: 100,
      y: 100,
      color: params.color,
      tags: [],
      todos: params.type === 'todo' ? [
        { id: `t-${Date.now()}`, text: params.content || 'First item', completed: false }
      ] : undefined,
      noteContent: params.type !== 'todo' ? params.content : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

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
      title: `${card.title} (Copy)`,
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
      title: 'New Cluster Group',
      color: 'blue',
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
    const targetX = -(card.x * activeDocument.viewport.zoom - window.innerWidth / 2 + 160);
    const targetY = -(card.y * activeDocument.viewport.zoom - window.innerHeight / 2 + 100);
    handlePanTo(targetX, targetY);
  };

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        documents={workspace.documents}
        activeDocId={workspace.activeDocId}
        userEmail={user.email}
        onSelectDocument={(id) => setWorkspace((prev) => ({ ...prev, activeDocId: id }))}
        onCreateDocument={() => setTemplatesModalOpen(true)}
        onDuplicateDocument={(id) => {
          const doc = workspace.documents.find((d) => d.id === id);
          if (!doc) return;
          const dup: BoardDocument = {
            ...doc,
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: `${doc.title} (Copy)`,
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
            activeDocId: remaining[0].id,
          }));
        }}
        onExportAll={() => exportWorkspaceJSON(workspace)}
        onImportBackup={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const restored = sanitizeWorkspace(JSON.parse(String(e.target?.result ?? '')));
              if (!restored) throw new Error('invalid');
              if (window.confirm('Replace all your spaces with the backup?')) {
                setWorkspace(restored);
              }
            } catch {
              alert('That file is not a valid Clustr backup.');
            }
          };
          reader.readAsText(file);
        }}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenAccount={() => setAccountModalOpen(true)}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Designer TopBar */}
        <TopBar
          document={activeDocument}
          theme={workspace.theme as 'dark' | 'light'}
          viewMode={viewMode}
          saveState={saveState}
          activeTagFilter={activeTagFilter}
          allTags={allTags}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleTheme={() =>
            setWorkspace((prev) => ({
              ...prev,
              theme: prev.theme === 'dark' ? 'light' : 'dark',
            }))
          }
          onToggleViewMode={() => setViewMode(viewMode === 'feed' ? 'canvas' : 'feed')}
          onSelectTagFilter={setActiveTagFilter}
          onAddCard={handleAddCard}
          onAddCluster={handleAddCluster}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onUpdateDocTitle={(title) => updateActiveDocument((doc) => ({ ...doc, title }))}
        />

        {/* Workspace Body: Mobile-First Feed View OR Spatial Canvas View */}
        <main className="flex-1 w-full h-full relative overflow-hidden">
          {viewMode === 'feed' ? (
            <MobileFeedView
              document={activeDocument}
              activeTagFilter={activeTagFilter}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
              onUpdateCluster={handleUpdateCluster}
              onDeleteCluster={handleDeleteCluster}
              onOpenQuickAdd={(type, clusterId) => {
                setQuickAddType(type);
                setQuickAddClusterId(clusterId || null);
                setQuickAddOpen(true);
              }}
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
              />

              {/* Designer MiniMap Radar */}
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

          {/* Mobile Bottom Thumb-Zone Floating Action Bar */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none select-none">
            {/* View switcher pill */}
            <button
              onClick={() => setViewMode(viewMode === 'feed' ? 'canvas' : 'feed')}
              className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 backdrop-blur-xl shadow-2xl text-xs font-bold transition-transform active:scale-95 border border-white/10 dark:border-black/10"
            >
              {viewMode === 'feed' ? <Map className="w-4 h-4 text-indigo-400 dark:text-indigo-600" /> : <LayoutGrid className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />}
              <span>{viewMode === 'feed' ? 'Canvas' : 'Feed'}</span>
            </button>

            {/* Quick Add Buttons */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setQuickAddType('note');
                  setQuickAddClusterId(null);
                  setQuickAddOpen(true);
                }}
                className="w-11 h-11 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center transition-transform active:scale-95"
                title="Quick Note"
              >
                <FileText className="w-5 h-5 text-emerald-500" />
              </button>

              <button
                onClick={() => {
                  setQuickAddType('todo');
                  setQuickAddClusterId(null);
                  setQuickAddOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 text-xs font-bold transition-transform active:scale-95 hover:bg-indigo-700"
                title="Add Task List"
              >
                <Plus className="w-4 h-4" />
                <span>+ Todo</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Spotlight Command Palette (Cmd+K) */}
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
        onToggleTheme={() =>
          setWorkspace((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onToggleViewMode={() => setViewMode(viewMode === 'feed' ? 'canvas' : 'feed')}
        onOpenAccount={() => setAccountModalOpen(true)}
        onFocusCard={handleFocusCard}
      />

      {/* Mobile Quick Add Bottom Sheet */}
      <MobileQuickAddSheet
        isOpen={quickAddOpen}
        initialType={quickAddType}
        initialClusterId={quickAddClusterId}
        clusters={activeDocument.clusters}
        onClose={() => setQuickAddOpen(false)}
        onAdd={handleAddCardFromQuickSheet}
      />

      {/* Account */}
      <AccountModal
        isOpen={accountModalOpen}
        userEmail={user.email}
        onSignOut={handleSignOut}
        onClose={() => setAccountModalOpen(false)}
      />

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onCreateWithTemplate={(newDoc) => {
          setWorkspace((prev) => ({
            ...prev,
            documents: [newDoc, ...prev.documents],
            activeDocId: newDoc.id,
          }));
        }}
      />
    </div>
  );
};

export default App;
