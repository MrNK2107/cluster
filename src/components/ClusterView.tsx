import React, { useState } from 'react';
import { 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Palette, 
  Move,
  CheckCircle2,
  FilePlus2,
  StickyNote
} from 'lucide-react';
import type { Cluster, CardData, CardColor, CardType } from '../types';
import { COLOR_MAP } from '../utils/storage';

interface ClusterViewProps {
  cluster: Cluster;
  cards: CardData[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: Partial<Cluster>) => void;
  onDelete: () => void;
  onStartDrag: (e: React.MouseEvent, clusterId: string) => void;
  onAddCardInside: (clusterId: string, type: CardType) => void;
}

export const ClusterView: React.FC<ClusterViewProps> = ({
  cluster,
  cards,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onStartDrag,
  onAddCardInside,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const colors: CardColor[] = ['default', 'blue', 'green', 'yellow', 'purple', 'pink', 'amber', 'rose'];
  const colorTheme = COLOR_MAP[cluster.color] || COLOR_MAP.default;

  // Calculate stats for this cluster
  let totalTodos = 0;
  let completedTodos = 0;
  cards.forEach(c => {
    if (c.todos) {
      totalTodos += c.todos.length;
      completedTodos += c.todos.filter(t => t.completed).length;
    }
  });

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'absolute',
        left: `${cluster.x}px`,
        top: `${cluster.y}px`,
        width: `${cluster.width}px`,
        minHeight: cluster.collapsed ? 'auto' : `${cluster.height}px`,
        zIndex: 5,
      }}
      className={`rounded-2xl border-2 transition-all duration-150 ${colorTheme.border} ${
        cluster.collapsed 
          ? 'bg-white/80 dark:bg-slate-900/80 shadow-md backdrop-blur-sm' 
          : 'bg-white/40 dark:bg-slate-900/30 backdrop-blur-[2px]'
      } ${isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : 'hover:border-slate-400 dark:hover:border-slate-600'}`}
    >
      {/* Cluster Header */}
      <div
        onMouseDown={(e) => onStartDrag(e, cluster.id)}
        className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl cursor-grab active:cursor-grabbing border-b ${colorTheme.border} ${colorTheme.header} select-none`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <Move className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" />
          <input
            type="text"
            value={cluster.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Cluster title..."
            className="w-full bg-transparent font-semibold text-sm text-slate-800 dark:text-slate-100 outline-none truncate focus:bg-white/50 dark:focus:bg-black/40 rounded px-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {/* Progress / Card Count Badge */}
          {totalTodos > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {completedTodos}/{totalTodos}
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>
          )}

          {/* Add Card dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              title="Add card inside this cluster"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    onAddCardInside(cluster.id, 'todo');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Todo Checklist
                </button>
                <button
                  onClick={() => {
                    onAddCardInside(cluster.id, 'note');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <FilePlus2 className="w-3.5 h-3.5 text-emerald-500" /> Unstructured Note
                </button>
                <button
                  onClick={() => {
                    onAddCardInside(cluster.id, 'sticky');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Sticky Note
                </button>
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400"
              title="Change cluster color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 flex gap-1 z-50">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onUpdate({ color: c });
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-125 ${
                      c === 'default' ? 'bg-slate-200' :
                      c === 'yellow' ? 'bg-amber-400' :
                      c === 'green' ? 'bg-emerald-400' :
                      c === 'blue' ? 'bg-sky-400' :
                      c === 'purple' ? 'bg-purple-400' :
                      c === 'pink' ? 'bg-pink-400' :
                      c === 'amber' ? 'bg-orange-400' : 'bg-rose-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Collapse/Expand */}
          <button
            onClick={() => onUpdate({ collapsed: !cluster.collapsed })}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400"
            title={cluster.collapsed ? 'Expand cluster' : 'Collapse cluster'}
          >
            {cluster.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {/* Delete cluster */}
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-400"
            title="Delete cluster (keeps cards as floating)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cluster Footer / Resize handle */}
      {!cluster.collapsed && (
        <div className="absolute bottom-1 right-1 cursor-se-resize p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
};
