import React, { useState } from 'react';
import { 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Palette, 
  GripVertical,
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
      className={`rounded-3xl border-2 transition-all duration-200 ${colorTheme.border} ${
        cluster.collapsed 
          ? 'bg-white/85 dark:bg-slate-900/85 shadow-lg backdrop-blur-xl' 
          : 'bg-white/30 dark:bg-slate-900/25 backdrop-blur-[4px]'
      } ${
        isSelected 
          ? 'ring-2 ring-indigo-500 shadow-2xl scale-[1.005]' 
          : 'hover:border-slate-400/60 dark:hover:border-white/20'
      }`}
    >
      {/* Cluster Header Bar */}
      <div
        onMouseDown={(e) => onStartDrag(e, cluster.id)}
        className={`flex items-center justify-between px-4 py-3 rounded-t-3xl cursor-grab active:cursor-grabbing border-b ${colorTheme.border} ${colorTheme.header} select-none`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 transition-colors" />
          <input
            type="text"
            value={cluster.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Cluster title..."
            className="w-full bg-transparent font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100 outline-none truncate focus:bg-white/50 dark:focus:bg-black/40 rounded px-1.5 py-0.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {/* Progress / Card Count Badge */}
          {totalTodos > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {completedTodos}/{totalTodos}
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>
          )}

          {/* Add Card dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
              title="Add card inside this cluster"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs">
                <button
                  onClick={() => {
                    onAddCardInside(cluster.id, 'todo');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Todo Checklist
                </button>
                <button
                  onClick={() => {
                    onAddCardInside(cluster.id, 'note');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <FilePlus2 className="w-3.5 h-3.5 text-emerald-500" /> Unstructured Note
                </button>
                <button
                  onClick={() => {
                    onAddCardInside(cluster.id, 'sticky');
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Sticky Note
                </button>
              </div>
            )}
          </div>

          {/* Color Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Change cluster tint"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1.5 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 flex gap-1.5 z-50">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onUpdate({ color: c });
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-125 ${
                      cluster.color === c ? 'ring-2 ring-indigo-500 scale-110' : ''
                    } ${
                      c === 'default' ? 'bg-slate-300' :
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
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title={cluster.collapsed ? 'Expand' : 'Collapse'}
          >
            {cluster.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {/* Delete cluster */}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-400 transition-colors"
            title="Delete cluster container"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
