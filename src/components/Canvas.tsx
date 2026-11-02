import React, { useRef, useState, useEffect } from 'react';
import type { CardData, Cluster, Connection, CardType } from '../types';
import { CardView, type CardVoting } from './CardView';
import { ClusterView } from './ClusterView';
import { ConnectionLines } from './ConnectionLines';

interface CanvasProps {
  cards: CardData[];
  clusters: Cluster[];
  connections: Connection[];
  viewport: { x: number; y: number; zoom: number };
  activeTagFilter: string | null;
  onUpdateViewport: (vp: { x: number; y: number; zoom: number }) => void;
  onUpdateCard: (id: string, updated: Partial<CardData>) => void;
  onDeleteCard: (id: string) => void;
  onDuplicateCard: (id: string) => void;
  onUpdateCluster: (id: string, updated: Partial<Cluster>) => void;
  onDeleteCluster: (id: string) => void;
  onAddCardInsideCluster: (clusterId: string, type: CardType) => void;
  onDeleteConnection: (id: string) => void;
  /** Set in a space shared with others: deleting a card becomes a vote. */
  voting?: CardVoting;
  onCreateAt?: (type: CardType, x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  cards,
  clusters,
  connections,
  viewport,
  activeTagFilter,
  onUpdateViewport,
  onUpdateCard,
  onDeleteCard,
  voting,
  onDuplicateCard,
  onUpdateCluster,
  onDeleteCluster,
  onAddCardInsideCluster,
  onDeleteConnection,
  onCreateAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dragging states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingClusterId, setDraggingClusterId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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

    const card = cards.find((c) => c.id === cardId);
    const el = (e.currentTarget as HTMLElement).closest('article');
    const box = containerRef.current?.getBoundingClientRect();
    if (!card || !el || !box) return;

    // Cards inside a cluster are laid out by the cluster, so read the real
    // position from the page and lift the card out while it is dragged.
    const rect = el.getBoundingClientRect();
    const screenX = rect.left - box.left;
    const screenY = rect.top - box.top;
    const x = Math.round((screenX - viewport.x) / viewport.zoom);
    const y = Math.round((screenY - viewport.y) / viewport.zoom);
    if (x !== card.x || y !== card.y) onUpdateCard(cardId, { x, y });

    setSelectedId(cardId);
    setDraggingCardId(cardId);
    setDropTargetId(card.clusterId ?? null);
    setDragOffset({ x: e.clientX - screenX, y: e.clientY - screenY });
  };

  // Start Cluster Drag
  const handleStartClusterDrag = (e: React.MouseEvent, clusterId: string) => {
    e.stopPropagation();

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

        onUpdateCard(draggingCardId, {
          x: Math.round((e.clientX - dragOffset.x - viewport.x) / viewport.zoom),
          y: Math.round((e.clientY - dragOffset.y - viewport.y) / viewport.zoom),
        });

        // The cluster under the pointer is where the card will land.
        let target: string | null = null;
        for (const node of containerRef.current?.querySelectorAll<HTMLElement>('[data-cluster-id]') ?? []) {
          const r = node.getBoundingClientRect();
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            target = node.dataset.clusterId ?? null;
          }
        }
        if (target !== dropTargetId) setDropTargetId(target);
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
      if (draggingCardId) {
        const card = cards.find((c) => c.id === draggingCardId);
        if (card && (card.clusterId ?? null) !== dropTargetId) {
          onUpdateCard(draggingCardId, { clusterId: dropTargetId });
        }
        setDropTargetId(null);
      }
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
  }, [isPanning, panStart, draggingCardId, draggingClusterId, dragOffset, dropTargetId, viewport, cards, clusters]);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, cards, clusters]);

  const renderCard = (card: CardData, inFlow: boolean) => {
    const matchesTag = !activeTagFilter || card.tags.includes(activeTagFilter);
    return (
      <div
        key={card.id}
        className={`transition-opacity duration-200 ${matchesTag ? 'opacity-100' : 'opacity-15 pointer-events-none'}`}
      >
        <CardView
          card={card}
          clusters={clusters}
          inFlow={inFlow}
          isDragging={card.id === draggingCardId}
          isSelected={selectedId === card.id}
          onSelect={() => setSelectedId(card.id)}
          onUpdate={(updated) => onUpdateCard(card.id, updated)}
          onDelete={() => onDeleteCard(card.id)}
          onDuplicate={() => onDuplicateCard(card.id)}
          onStartDrag={handleStartCardDrag}
          voting={voting}
        />
      </div>
    );
  };
  const isEmpty = cards.length === 0 && clusters.length === 0;

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onCreateAt) return;
    const target = e.target as HTMLElement;
    if (target !== containerRef.current && !target.classList.contains('canvas-background')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round((e.clientX - rect.left - viewport.x) / viewport.zoom) - 40;
    const y = Math.round((e.clientY - rect.top - viewport.y) / viewport.zoom) - 24;
    onCreateAt('sticky', x, y);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden canvas-background bg-ink-100 dark:bg-ink-950 canvas-grid-dots select-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      }`}
    >
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm text-center animate-pop-in">
            <div className="mx-auto mb-5 w-16 h-16 rotate-[-4deg] rounded-2xl bg-sun-300 shadow-[0_18px_30px_-16px_rgba(20,20,60,0.45)]" />
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-white">A blank canvas</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500 dark:text-ink-400">
              Double-click anywhere to drop a sticky, or pick something from the toolbar below.
            </p>
          </div>
        </div>
      )}

      {/* Transformable canvas layer */}
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none [&>:not(svg)]:pointer-events-auto"
      >
        <ConnectionLines
          connections={connections}
          cards={cards}
          clusters={clusters}
          onDeleteConnection={onDeleteConnection}
        />

        {clusters.map((cluster) => {
          const inside = cards.filter((c) => c.clusterId === cluster.id);
          return (
            <ClusterView
              key={cluster.id}
              cluster={cluster}
              cards={inside}
              isSelected={selectedId === cluster.id}
              isDropTarget={draggingCardId !== null && dropTargetId === cluster.id}
              onSelect={() => setSelectedId(cluster.id)}
              onUpdate={(updated) => onUpdateCluster(cluster.id, updated)}
              onDelete={() => onDeleteCluster(cluster.id)}
              onStartDrag={handleStartClusterDrag}
              onAddCardInside={onAddCardInsideCluster}
            >
              {!cluster.collapsed && inside.filter((c) => c.id !== draggingCardId).map((card) => renderCard(card, true))}
            </ClusterView>
          );
        })}

        {cards
          .filter((c) => c.id === draggingCardId || !c.clusterId || !clusters.some((cl) => cl.id === c.clusterId))
          .map((card) => renderCard(card, false))}
      </div>
    </div>
  );
};
