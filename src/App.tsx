import React, { useState, useEffect, useMemo } from 'react';
import type { 
  WorkspaceData, 
  BoardDocument, 
  CardData, 
  Cluster, 
  Connection, 
  CardType 
} from './types';
import { 
  loadWorkspace, 
  saveWorkspace, 
  exportWorkspaceJSON, 
  INITIAL_DOCUMENTS 
} from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Canvas } from './components/Canvas';
import { ShareModal } from './components/ShareModal';
import { TemplatesModal } from './components/TemplatesModal';

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => loadWorkspace());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [connectMode, setConnectMode] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  // Check URL hash for shared document snapshot
  useEffect(() => {
    if (window.location.hash.startsWith('#doc=')) {
      try {
        const encoded = window.location.hash.replace('#doc=', '');
        const jsonStr = decodeURIComponent(atob(encoded));
        const sharedDoc: BoardDocument = JSON.parse(jsonStr);
        if (sharedDoc && sharedDoc.id) {
          // Add as new or overwrite
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
          // Clear hash to prevent duplicate prompt on reload
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to parse document from URL hash', e);
      }
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  // Sync Dark/Light theme class to html root
  useEffect(() => {
    if (workspace.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [workspace.theme]);

  // Get active document
  const activeDocument = useMemo(() => {
    return (
      workspace.documents.find((d) => d.id === workspace.activeDocId) ||
      workspace.documents[0] ||
      INITIAL_DOCUMENTS[0]
    );
  }, [workspace.documents, workspace.activeDocId]);

  // Extract all unique tags across cards in active document
  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeDocument.cards.forEach((c) => {
      c.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [activeDocument.cards]);

  // Helper to update active document in workspace
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
    // Spawn card in center of current viewport
    const vp = activeDocument.viewport;
    const spawnX = Math.round((-vp.x + 300) / vp.zoom);
    const spawnY = Math.round((-vp.y + 200) / vp.zoom);

    const defaultColor = type === 'todo' ? 'blue' : type === 'note' ? 'green' : type === 'sticky' ? 'yellow' : 'pink';

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
        { id: `t-${Date.now()}`, text: 'First item to get done', completed: false, priority: 'medium' }
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

    // Position card nicely inside cluster
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
    // Delete cluster container but detach contained cards so user doesn't accidentally lose work!
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

  // Viewport / Zoom
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

  // Workspace Document Operations
  const handleSelectDocument = (id: string) => {
    setWorkspace((prev) => ({ ...prev, activeDocId: id }));
  };

  const handleDuplicateDocument = (id: string) => {
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
  };

  const handleDeleteDocument = (id: string) => {
    if (workspace.documents.length <= 1) return;
    const remaining = workspace.documents.filter((d) => d.id !== id);
    setWorkspace((prev) => ({
      ...prev,
      documents: remaining,
      activeDocId: remaining[0].id,
    }));
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.documents && Array.isArray(parsed.documents)) {
          setWorkspace(parsed);
        } else if (parsed.clusters && parsed.cards) {
          // It's a single document
          setWorkspace((prev) => ({
            ...prev,
            documents: [parsed, ...prev.documents],
            activeDocId: parsed.id,
          }));
        }
      } catch (err) {
        alert('Could not parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        documents={workspace.documents}
        activeDocId={workspace.activeDocId}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={() => setTemplatesModalOpen(true)}
        onDuplicateDocument={handleDuplicateDocument}
        onDeleteDocument={handleDeleteDocument}
        onExportAll={() => exportWorkspaceJSON(workspace)}
        onImportBackup={handleImportBackup}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Navigation Bar */}
        <TopBar
          document={activeDocument}
          theme={workspace.theme as 'dark' | 'light'}
          connectMode={connectMode}
          activeTagFilter={activeTagFilter}
          allTags={allTags}
          zoom={activeDocument.viewport.zoom}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleTheme={() =>
            setWorkspace((prev) => ({
              ...prev,
              theme: prev.theme === 'dark' ? 'light' : 'dark',
            }))
          }
          onToggleConnectMode={() => setConnectMode(!connectMode)}
          onSelectTagFilter={setActiveTagFilter}
          onAddCard={handleAddCard}
          onAddCluster={handleAddCluster}
          onZoomIn={() => handleZoom(0.15)}
          onZoomOut={() => handleZoom(-0.15)}
          onResetZoom={handleResetZoom}
          onOpenShareModal={() => setShareModalOpen(true)}
          onUpdateDocTitle={(title) => updateActiveDocument((doc) => ({ ...doc, title }))}
        />

        {/* Spatial Canvas */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
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
        </div>
      </div>

      {/* Share / Export Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        document={activeDocument}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Template & New Document Modal */}
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
