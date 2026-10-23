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

  // Touch gesture state (pinch-zoom and touch pan)
  const touchStartRef = useRef<{ dist: number; midX: number; midY: number; vpX: number; vpY: number; zoom: number } | null>(null);

  // Handle Zooming via wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (e.target === containerRef.current || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.3), 2.5);
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

      onUpdateViewport({ x: newX, y: newY, zoom: newZoom });
    } else {
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

  // Touch Handlers for mobile & tablets (pinch-zoom and touch pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers: pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current = {
        dist,
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
        vpX: viewport.x,
        vpY: viewport.y,
        zoom: viewport.zoom,
      };
    } else if (e.touches.length === 1 && (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-background'))) {
      // 1 finger on canvas background: pan
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - viewport.x, y: e.touches[0].clientY - viewport.y });
      setSelectedId(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = newDist / touchStartRef.current.dist;
      const newZoom = Math.min(Math.max(touchStartRef.current.zoom * scale, 0.3), 2.5);

      onUpdateViewport({
        x: touchStartRef.current.vpX,
        y: touchStartRef.current.vpY,
        zoom: newZoom,
      });
    } else if (e.touches.length === 1 && isPanning) {
      onUpdateViewport({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
        zoom: viewport.zoom,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setIsPanning(false);
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

        onUpdateCluster(draggingClusterId, {
          x: newCanvasX,
          y: newCanvasY,
        });

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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden canvas-background bg-slate-50 dark:bg-[#0b0f17] canvas-grid-dots dark:canvas-grid-dots-dark select-none ${
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
          const matchesTag = !activeTagFilter || card.tags.includes(activeTagFilter);
          
          return (
            <div
              key={card.id}
              className={`transition-opacity duration-200 ${
                matchesTag ? 'opacity-100' : 'opacity-20 pointer-events-none'
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
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-indigo-600/95 backdrop-blur-xl text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2.5 z-40 animate-subtle border border-indigo-400/40">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{connectingSourceId ? 'Click destination card or cluster' : 'Click first card to start relation arrow'}</span>
        </div>
      )}
    </div>
  );
};
