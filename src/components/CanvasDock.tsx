import React from 'react';
import { CheckSquare, FileText, StickyNote, Hash, Link2, Layers } from 'lucide-react';
import type { CardType } from '../types';
import { cn } from '../utils/cn';

export const CARD_KINDS: {
  type: CardType;
  label: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}[] = [
  { type: 'todo', label: 'To-do list', key: 'T', icon: CheckSquare, tint: 'text-brand-500' },
  { type: 'note', label: 'Note', key: 'N', icon: FileText, tint: 'text-mint-500' },
  { type: 'sticky', label: 'Sticky', key: 'S', icon: StickyNote, tint: 'text-sun-500' },
  { type: 'counter', label: 'Tally', key: 'Y', icon: Hash, tint: 'text-pink-500' },
  { type: 'links', label: 'Links', key: 'L', icon: Link2, tint: 'text-violet-500' },
];

/** Floating "add" toolbar along the bottom of the canvas (desktop/tablet). */
export const CanvasDock: React.FC<{
  onAddCard: (type: CardType) => void;
  onAddCluster: () => void;
}> = ({ onAddCard, onAddCluster }) => (
  <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-20 select-none">
    <div
      role="toolbar"
      aria-label="Add to canvas"
      className="flex items-center gap-1 p-1.5 rounded-2xl bg-white/90 dark:bg-ink-900/90 glass-panel ring-1 ring-ink-900/[0.07] dark:ring-white/10 float-shadow"
    >
      {CARD_KINDS.map(({ type, label, key, icon: Icon, tint }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAddCard(type)}
          title={`Add ${label.toLowerCase()} (${key})`}
          className="group relative flex flex-col items-center justify-center gap-1 w-[68px] h-14 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all"
        >
          <Icon className={cn('w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5', tint)} />
          <span className="text-[11px] font-semibold">{label === 'To-do list' ? 'To-do' : label}</span>
        </button>
      ))}
      <span className="w-px h-9 mx-1 bg-ink-200 dark:bg-ink-700" aria-hidden="true" />
      <button
        type="button"
        onClick={onAddCluster}
        title="Add cluster (C)"
        className="flex items-center gap-2 h-14 px-4 rounded-xl bg-brand-600 text-white font-semibold text-[13px] hover:bg-brand-700 active:scale-95 transition-all shadow-[0_10px_22px_-12px] shadow-brand-600"
      >
        <Layers className="w-[18px] h-[18px]" />
        Cluster
      </button>
    </div>
  </div>
);
