import React from 'react';
import type { Connection, CardData, Cluster } from '../types';

interface ConnectionLinesProps {
  connections: Connection[];
  cards: CardData[];
  clusters: Cluster[];
  onDeleteConnection: (id: string) => void;
}

export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
  connections,
  cards,
  clusters,
  onDeleteConnection,
}) => {
  const getItemCenter = (id: string): { x: number; y: number } | null => {
    const card = cards.find((c) => c.id === id);
    if (card) {
      return {
        x: card.x + (card.width || 320) / 2,
        y: card.y + 60,
      };
    }
    const cluster = clusters.find((c) => c.id === id);
    if (cluster) {
      return {
        x: cluster.x + cluster.width / 2,
        y: cluster.y + 40,
      };
    }
    return null;
  };

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
        </marker>
      </defs>

      {connections.map((conn) => {
        const from = getItemCenter(conn.fromId);
        const to = getItemCenter(conn.toId);
        if (!from || !to) return null;

        const dx = to.x - from.x;
        const cx1 = from.x + dx * 0.5;
        const cy1 = from.y;
        const cx2 = from.x + dx * 0.5;
        const cy2 = to.y;

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={conn.id} className="pointer-events-auto group">
            <path
              d={`M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              markerEnd="url(#arrowhead)"
              className="opacity-60 group-hover:opacity-100 transition-opacity"
            />
            {/* Click to delete connection */}
            <circle
              cx={midX}
              cy={midY}
              r="10"
              fill="#ef4444"
              className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              onClick={() => onDeleteConnection(conn.id)}
            />
            <text
              x={midX}
              y={midY - 12}
              textAnchor="middle"
              className="fill-indigo-600 dark:fill-indigo-400 text-[11px] font-semibold select-none bg-white dark:bg-slate-900 px-1"
            >
              {conn.label || ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
