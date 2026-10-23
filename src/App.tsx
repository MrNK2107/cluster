import React, { useState, useEffect, useMemo } from 'react';
import type { 
  WorkspaceData, 
  BoardDocument, 
  CardData, 
  Cluster, 
  Connection, 
  CardType,
  CardColor 
} from './types';
import { 
  loadWorkspaceFromDB, 
  saveWorkspaceToDB 
} from './utils/db';
import { 
  INITIAL_DOCUMENTS, 
  exportWorkspaceJSON 
} from './utils/storage';
import { 
  getSupabaseClient, 
  fetchCloudWorkspace, 
  syncWorkspaceToSupabase 
} from './utils/supabase';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { MobileFeedView } from './components/MobileFeedView';
import { MobileQuickAddSheet } from './components/MobileQuickAddSheet';
import { ShareModal } from './components/ShareModal';
import { TemplatesModal } from './components/TemplatesModal';
import { SupabaseModal } from './components/SupabaseModal';
import { CommandPalette } from './components/CommandPalette';
import { MiniMap } from './components/MiniMap';
import { Plus, FileText, Map, LayoutGrid } from 'lucide-react';

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceData>({
    version: 1,
    activeDocId: INITIAL_DOCUMENTS[0].id,
    documents: INITIAL_DOCUMENTS,
    theme: 'dark',
  });

  const [viewMode, setViewMode] = useState<'canvas' | 'feed'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'feed' : 'canvas';
  });

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const [connectMode, setConnectMode] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<CardType>('todo');
  const [quickAddClusterId, setQuickAddClusterId] = useState<string | null>(null);

  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    async function initDB() {
      const stored = await loadWorkspaceFromDB();
      if (stored) {
        setWorkspace(stored);
      }
      checkSupabase();
    }
    initDB();
  }, []);

  const checkSupabase = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: { user } } = await client.auth.getUser();
        setIsCloudSynced(!!user);
      } catch (e) {
        setIsCloudSynced(false);
      }
    } else {
      setIsCloudSynced(false);
    }
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

  // URL Hash document snapshot check
  useEffect(() => {
    if (window.location.hash.startsWith('#doc=')) {
      try {
        const encoded = window.location.hash.replace('#doc=', '');
        const jsonStr = decodeURIComponent(atob(encoded));
        const sharedDoc: BoardDocument = JSON.parse(jsonStr);
        if (sharedDoc && sharedDoc.id) {
          setWorkspace((prev) => {
            const exists = prev.documents.some((d) => d.id === sharedDoc.id);
            const updatedDocs = exists
              ? prev.documents.map((d) => (d.id === sharedDoc.id ? sharedDoc : d))
              : [sharedDoc, ...prev.documents];
            return {
              ...prev,
              activeDocId: sharedDoc.id,
              documents: updatedDocs,
            };
          });
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to parse document from URL hash', e);
      }
    }
  }, []);

  // Save changes to IndexedDB
  useEffect(() => {
    saveWorkspaceToDB(workspace);
  }, [workspace]);

  // Sync Dark/Light theme class
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
  const handleAddConnection = (fromId: string, toId: string) => {
    const newConn: Connection = {
      id: `conn-${Date.now()}`,
      fromId,
      toId,
      label: 'relates to',
    };
    updateActiveDocument((doc) => ({
      ...doc,
      connections: [...doc.connections, newConn],
    }));
    setConnectMode(false);
  };

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

  // Supabase Cloud Sync
  const handleSyncPushToSupabase = async () => {
    const res = await syncWorkspaceToSupabase(workspace);
    if (!res.success) {
      throw new Error(res.error || 'Failed to sync');
    }
    setIsCloudSynced(true);
  };

  const handleSyncPullFromSupabase = async () => {
    const res = await fetchCloudWorkspace();
    if (res.data) {
      setWorkspace(res.data);
      setIsCloudSynced(true);
    } else {
      throw new Error(res.error || 'No remote workspace found');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        documents={workspace.documents}
        activeDocId={workspace.activeDocId}
        isCloudSynced={isCloudSynced}
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
              const parsed = JSON.parse(e.target?.result as string);
              if (parsed.documents && Array.isArray(parsed.documents)) {
                setWorkspace(parsed);
              }
            } catch (err) {
              alert('Could not parse backup JSON file.');
            }
          };
          reader.readAsText(file);
        }}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSupabase={() => setSupabaseModalOpen(true)}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Designer TopBar */}
        <TopBar
          document={activeDocument}
          theme={workspace.theme as 'dark' | 'light'}
          viewMode={viewMode}
          connectMode={connectMode}
          activeTagFilter={activeTagFilter}
          allTags={allTags}
          isCloudSynced={isCloudSynced}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleTheme={() =>
            setWorkspace((prev) => ({
              ...prev,
              theme: prev.theme === 'dark' ? 'light' : 'dark',
            }))
          }
          onToggleViewMode={() => setViewMode(viewMode === 'feed' ? 'canvas' : 'feed')}
          onToggleConnectMode={() => setConnectMode(!connectMode)}
          onSelectTagFilter={setActiveTagFilter}
          onAddCard={handleAddCard}
          onAddCluster={handleAddCluster}
          onOpenShareModal={() => setShareModalOpen(true)}
          onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
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
                connectMode={connectMode}
                onUpdateViewport={handleUpdateViewport}
                onUpdateCard={handleUpdateCard}
                onDeleteCard={handleDeleteCard}
                onDuplicateCard={handleDuplicateCard}
                onUpdateCluster={handleUpdateCluster}
                onDeleteCluster={handleDeleteCluster}
                onAddCardInsideCluster={handleAddCardInsideCluster}
                onDeleteConnection={handleDeleteConnection}
                onAddConnection={handleAddConnection}
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
        onOpenSupabase={() => setSupabaseModalOpen(true)}
        onOpenShare={() => setShareModalOpen(true)}
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

      {/* Supabase Free Cloud Storage & Auth Modal */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onSyncPush={handleSyncPushToSupabase}
        onSyncPull={handleSyncPullFromSupabase}
      />

      {/* Share / Export Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        document={activeDocument}
        onClose={() => setShareModalOpen(false)}
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
