import React, { useRef } from 'react';
import type { CardData, Cluster } from '../types';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

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
  const mapWidth = 160;
  const mapHeight = 110;
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
    <div className="hidden sm:flex flex-col items-end gap-2 fixed bottom-6 right-6 z-20 select-none">
      {/* Floating Island Zoom Pills */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg text-slate-700 dark:text-slate-200">
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onResetZoom}
          className="px-2 py-1 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors tabular-nums"
          title="Reset View"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MiniMap Canvas Radar */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
        className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl overflow-hidden cursor-crosshair group hover:border-indigo-500/50 transition-colors"
        title="Click to navigate canvas"
      >
        <div className="absolute top-1.5 left-2 flex items-center gap-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase pointer-events-none">
          <Compass className="w-2.5 h-2.5" />
          <span>Radar</span>
        </div>

        {/* Render mini clusters */}
        {clusters.map((cl) => (
          <div
            key={cl.id}
            style={{
              left: `${Math.max(0, cl.x * worldScale)}px`,
              top: `${Math.max(0, cl.y * worldScale)}px`,
              width: `${Math.max(4, cl.width * worldScale)}px`,
              height: `${Math.max(4, cl.height * worldScale)}px`,
            }}
            className="absolute rounded-sm border border-indigo-400/40 bg-indigo-500/10 pointer-events-none"
          />
        ))}

        {/* Render mini cards */}
        {cards.map((c) => (
          <div
            key={c.id}
            style={{
              left: `${Math.max(0, c.x * worldScale)}px`,
              top: `${Math.max(0, c.y * worldScale)}px`,
              width: `${Math.max(4, (c.width || 320) * worldScale)}px`,
              height: `${Math.max(3, 140 * worldScale)}px`,
            }}
            className="absolute rounded-xs bg-slate-400 dark:bg-slate-500/60 pointer-events-none"
          />
        ))}

        {/* Render current viewport window */}
        <div
          style={{
            left: `${Math.max(0, vpRectX)}px`,
            top: `${Math.max(0, vpRectY)}px`,
            width: `${Math.min(mapWidth, Math.max(12, vpRectW))}px`,
            height: `${Math.min(mapHeight, Math.max(10, vpRectH))}px`,
          }}
          className="absolute rounded-md border-2 border-indigo-500 bg-indigo-500/15 pointer-events-none shadow-xs"
        />
      </div>
    </div>
  );
};
