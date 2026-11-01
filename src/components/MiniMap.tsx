import React, { useRef } from 'react';
import type { CardData, Cluster } from '../types';
import { Minus, Plus } from 'lucide-react';
import { colorTheme } from '../theme/colors';

interface MiniMapProps {
  cards: CardData[];
  clusters: Cluster[];
  viewport: { x: number; y: number; zoom: number };
  onPanTo: (x: number, y: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  cards,
  clusters,
  viewport,
  onPanTo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  // Map dimensions
  const mapWidth = 176;
  const mapHeight = 112;
  const worldScale = 0.08; // scale canvas coords to minimap

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap coords to canvas world coords
    const worldTargetX = clickX / worldScale;
    const worldTargetY = clickY / worldScale;

    // Center viewport around this point
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const newVpX = -(worldTargetX * viewport.zoom - screenW / 2);
    const newVpY = -(worldTargetY * viewport.zoom - screenH / 2);

    onPanTo(newVpX, newVpY);
  };

  // Viewport rectangle in minimap
  const vpRectX = (-viewport.x / viewport.zoom) * worldScale;
  const vpRectY = (-viewport.y / viewport.zoom) * worldScale;
  const vpRectW = (window.innerWidth / viewport.zoom) * worldScale;
  const vpRectH = (window.innerHeight / viewport.zoom) * worldScale;

  return (
    <div className="hidden md:flex flex-col items-end gap-2 absolute bottom-6 right-6 z-20 select-none">
      <div
        ref={mapRef}
        onClick={handleMapClick}
        style={{ width: mapWidth, height: mapHeight }}
        className="hidden lg:block relative rounded-2xl bg-white/85 dark:bg-ink-900/85 glass-panel ring-1 ring-ink-900/[0.07] dark:ring-white/10 float-shadow overflow-hidden cursor-pointer"
        role="button"
        aria-label="Overview map. Click to jump there."
        title="Click to jump there"
      >
        {clusters.map((cl) => (
          <div
            key={cl.id}
            style={{
              left: Math.max(0, cl.x * worldScale),
              top: Math.max(0, cl.y * worldScale),
              width: Math.max(4, cl.width * worldScale),
              height: Math.max(4, cl.height * worldScale),
              backgroundColor: `${colorTheme(cl.color).accent}22`,
              borderColor: `${colorTheme(cl.color).accent}88`,
            }}
            className="absolute rounded-[3px] border pointer-events-none"
          />
        ))}
        {cards.filter((c) => !c.clusterId || !clusters.some((cl) => cl.id === c.clusterId)).map((c) => (
          <div
            key={c.id}
            style={{
              left: Math.max(0, c.x * worldScale),
              top: Math.max(0, c.y * worldScale),
              width: Math.max(4, (c.width || 320) * worldScale),
              height: Math.max(3, 140 * worldScale),
              backgroundColor: colorTheme(c.color).accent,
            }}
            className="absolute rounded-[2px] opacity-70 pointer-events-none"
          />
        ))}
        <div
          style={{
            left: Math.max(0, vpRectX),
            top: Math.max(0, vpRectY),
            width: Math.min(mapWidth, Math.max(12, vpRectW)),
            height: Math.min(mapHeight, Math.max(10, vpRectH)),
          }}
          className="absolute rounded-md ring-2 ring-ink-900/70 dark:ring-white/80 pointer-events-none"
        />
      </div>

      <div className="flex items-center p-1 rounded-xl bg-white/90 dark:bg-ink-900/90 glass-panel ring-1 ring-ink-900/[0.07] dark:ring-white/10 float-shadow text-ink-600 dark:text-ink-300">
        <button type="button" onClick={onZoomOut} aria-label="Zoom out" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          title="Reset view"
          className="h-8 min-w-14 px-1 rounded-lg text-[12px] font-semibold tabular-nums hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button type="button" onClick={onZoomIn} aria-label="Zoom in" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
