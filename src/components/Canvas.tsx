import React, { useRef, useState, useEffect } from 'react';
import type { CardData, Cluster, Connection, CardType } from '../types';
import { CardView } from './CardView';
import { ClusterView } from './ClusterView';
import { ConnectionLines } from './ConnectionLines';

interface CanvasProps {
  cards: CardData[];
  clusters: Cluster[];
  connections: Connection[];
  viewport: { x: number; y: number; zoom: number };
  activeTagFilter: string | null;
  connectMode: boolean;
  onUpdateViewport: (vp: { x: number; y: number; zoom: number }) => void;
  onUpdateCard: (id: string, updated: Partial<CardData>) => void;
  onDeleteCard: (id: string) => void;
  onDuplicateCard: (id: string) => void;
  onUpdateCluster: (id: string, updated: Partial<Cluster>) => void;
  onDeleteCluster: (id: string) => void;
  onAddCardInsideCluster: (clusterId: string, type: CardType) => void;
  onDeleteConnection: (id: string) => void;
  onAddConnection: (fromId: string, toId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  cards,
  clusters,
  connections,
  viewport,
  activeTagFilter,
  connectMode,
  onUpdateViewport,
  onUpdateCard,
  onDeleteCard,
  onDuplicateCard,
  onUpdateCluster,
  onDeleteCluster,
  onAddCardInsideCluster,
  onDeleteConnection,
  onAddConnection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Dragging states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingClusterId, setDraggingClusterId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle Zooming via wheel
  const handleWheel = (e: React.WheelEvent) => {
    // If scrolling on canvas background or with ctrl/meta
    if (e.target === containerRef.current || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.3), 2.5);
      
      // Calculate mouse position relative to container
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust viewport so zoom centers around mouse
      const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

      onUpdateViewport({ x: newX, y: newY, zoom: newZoom });
    } else {
      // Normal two-finger scroll panning
      onUpdateViewport({
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
        zoom: viewport.zoom,
      });
    }
  };

  // Start Canvas Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-background'))) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      setSelectedId(null);
    }
  };

  // Start Card Drag
  const handleStartCardDrag = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    if (connectMode) {
      handleHandleConnectClick(cardId);
      return;
    }

    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    setSelectedId(cardId);
    setDraggingCardId(cardId);
    
    // Store cursor offset relative to card position
    const cardScreenX = card.x * viewport.zoom + viewport.x;
    const cardScreenY = card.y * viewport.zoom + viewport.y;
    setDragOffset({
      x: e.clientX - cardScreenX,
      y: e.clientY - cardScreenY,
    });
  };

  // Start Cluster Drag
  const handleStartClusterDrag = (e: React.MouseEvent, clusterId: string) => {
    e.stopPropagation();
    if (connectMode) {
      handleHandleConnectClick(clusterId);
      return;
    }

    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    setSelectedId(clusterId);
    setDraggingClusterId(clusterId);

    const clusterScreenX = cluster.x * viewport.zoom + viewport.x;
    const clusterScreenY = cluster.y * viewport.zoom + viewport.y;
    setDragOffset({
      x: e.clientX - clusterScreenX,
      y: e.clientY - clusterScreenY,
    });
  };

  // Handle Connecting 2 items
  const handleHandleConnectClick = (id: string) => {
    if (!connectingSourceId) {
      setConnectingSourceId(id);
    } else {
      if (connectingSourceId !== id) {
        onAddConnection(connectingSourceId, id);
      }
      setConnectingSourceId(null);
    }
  };

  // Mouse Move listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        onUpdateViewport({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
          zoom: viewport.zoom,
        });
      } else if (draggingCardId) {
        const card = cards.find((c) => c.id === draggingCardId);
        if (!card) return;

        // Calculate new canvas coordinates
        const newCanvasX = Math.round((e.clientX - dragOffset.x - viewport.x) / viewport.zoom);
        const newCanvasY = Math.round((e.clientY - dragOffset.y - viewport.y) / viewport.zoom);

        // Check if dropped inside a cluster
        let targetClusterId: string | null = null;
        for (const cl of clusters) {
          if (
            newCanvasX >= cl.x &&
            newCanvasX <= cl.x + cl.width &&
            newCanvasY >= cl.y &&
            newCanvasY <= cl.y + cl.height
          ) {
            targetClusterId = cl.id;
            break;
          }
        }

        onUpdateCard(draggingCardId, {
          x: newCanvasX,
          y: newCanvasY,
          clusterId: targetClusterId,
        });
      } else if (draggingClusterId) {
        const cluster = clusters.find((c) => c.id === draggingClusterId);
        if (!cluster) return;

        const newCanvasX = Math.round((e.clientX - dragOffset.x - viewport.x) / viewport.zoom);
        const newCanvasY = Math.round((e.clientY - dragOffset.y - viewport.y) / viewport.zoom);

        const deltaX = newCanvasX - cluster.x;
        const deltaY = newCanvasY - cluster.y;

        // Move cluster
        onUpdateCluster(draggingClusterId, {
          x: newCanvasX,
          y: newCanvasY,
        });

        // Also move all contained cards
        cards
          .filter((c) => c.clusterId === draggingClusterId)
          .forEach((c) => {
            onUpdateCard(c.id, {
              x: c.x + deltaX,
              y: c.y + deltaY,
            });
          });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setDraggingCardId(null);
      setDraggingClusterId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, panStart, draggingCardId, draggingClusterId, dragOffset, viewport, cards, clusters]);

  // Keyboard shortcuts (Delete, Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          if (cards.some((c) => c.id === selectedId)) {
            onDeleteCard(selectedId);
            setSelectedId(null);
          } else if (clusters.some((cl) => cl.id === selectedId)) {
            onDeleteCluster(selectedId);
            setSelectedId(null);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedId && cards.some((c) => c.id === selectedId)) {
          onDuplicateCard(selectedId);
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setConnectingSourceId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, cards, clusters]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      className={`relative w-full h-full overflow-hidden canvas-background bg-slate-100 dark:bg-slate-950 canvas-grid-dots dark:canvas-grid-dots-dark select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Transformable Canvas Layer */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-auto"
      >
        {/* Connection Lines Layer */}
        <ConnectionLines
          connections={connections}
          cards={cards}
          clusters={clusters}
          onDeleteConnection={onDeleteConnection}
        />

        {/* Clusters */}
        {clusters.map((cluster) => {
          const clusterCards = cards.filter((c) => c.clusterId === cluster.id);
          return (
            <ClusterView
              key={cluster.id}
              cluster={cluster}
              cards={clusterCards}
              isSelected={selectedId === cluster.id || connectingSourceId === cluster.id}
              onSelect={() => {
                if (connectMode) {
                  handleHandleConnectClick(cluster.id);
                } else {
                  setSelectedId(cluster.id);
                }
              }}
              onUpdate={(updated) => onUpdateCluster(cluster.id, updated)}
              onDelete={() => onDeleteCluster(cluster.id)}
              onStartDrag={handleStartClusterDrag}
              onAddCardInside={onAddCardInsideCluster}
            />
          );
        })}

        {/* Cards */}
        {cards.map((card) => {
          // If tag filter is active, check match
          const matchesTag = !activeTagFilter || card.tags.includes(activeTagFilter);
          
          return (
            <div
              key={card.id}
              className={`transition-opacity duration-200 ${
                matchesTag ? 'opacity-100' : 'opacity-25 pointer-events-none'
              }`}
            >
              <CardView
                card={card}
                clusters={clusters}
                isSelected={selectedId === card.id || connectingSourceId === card.id}
                onSelect={() => {
                  if (connectMode) {
                    handleHandleConnectClick(card.id);
                  } else {
                    setSelectedId(card.id);
                  }
                }}
                onUpdate={(updated) => onUpdateCard(card.id, updated)}
                onDelete={() => onDeleteCard(card.id)}
                onDuplicate={() => onDuplicateCard(card.id)}
                onStartDrag={handleStartCardDrag}
              />
            </div>
          );
        })}
      </div>

      {/* Floating connect mode banner */}
      {connectMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 z-40 animate-pulse">
          <span>{connectingSourceId ? 'Now click destination card/cluster to complete arrow' : 'Click first card/cluster to connect'}</span>
        </div>
      )}
    </div>
  );
};
