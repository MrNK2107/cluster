import React, { useState } from 'react';
import { X, CheckSquare, FileText, StickyNote, Plus } from 'lucide-react';
import type { CardType, CardColor, Cluster } from '../types';

interface MobileQuickAddSheetProps {
  isOpen: boolean;
  initialType?: CardType;
  initialClusterId?: string | null;
  clusters: Cluster[];
  onClose: () => void;
  onAdd: (params: {
    type: CardType;
    title: string;
    content: string;
    clusterId: string | null;
    color: CardColor;
  }) => void;
}

export const MobileQuickAddSheet: React.FC<MobileQuickAddSheetProps> = ({
  isOpen,
  initialType = 'todo',
  initialClusterId = null,
  clusters,
  onClose,
  onAdd,
}) => {
  const [type, setType] = useState<CardType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [clusterId, setClusterId] = useState<string | null>(initialClusterId);
  const [color, setColor] = useState<CardColor>('blue');

  const colors: CardColor[] = ['blue', 'green', 'yellow', 'purple', 'pink', 'amber', 'rose'];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    onAdd({
      type,
      title: title.trim() || (type === 'todo' ? 'New Task List' : 'Quick Note'),
      content: content.trim(),
      clusterId,
      color,
    });

    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-50 select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('todo');
                setColor('blue');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                type === 'todo'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" /> Todo List
            </button>
            <button
              type="button"
              onClick={() => {
                setType('note');
                setColor('green');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                type === 'note'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Note
            </button>
            <button
              type="button"
              onClick={() => {
                setType('sticky');
                setColor('amber');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                type === 'sticky'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" /> Sticky
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              autoFocus
              placeholder="Card Title (e.g. Frontdesk Morning Tasks)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {type === 'todo' ? (
            <div>
              <input
                type="text"
                placeholder="First task... (use #tags for auto tags)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          ) : (
            <div>
              <textarea
                placeholder="Jot down quick thoughts, bullets, notes..."
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none font-sans"
              />
            </div>
          )}

          {/* Color bar */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Color:</span>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-indigo-500' : ''
                } ${
                  c === 'blue' ? 'bg-sky-400' :
                  c === 'green' ? 'bg-emerald-400' :
                  c === 'yellow' ? 'bg-amber-400' :
                  c === 'purple' ? 'bg-purple-400' :
                  c === 'pink' ? 'bg-pink-400' :
                  c === 'amber' ? 'bg-orange-400' : 'bg-rose-400'
                }`}
              />
            ))}
          </div>

          {/* Cluster Selector */}
          {clusters.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Assign to Cluster:
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setClusterId(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 border ${
                    clusterId === null
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Floating (None)
                </button>
                {clusters.map((cl) => (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => setClusterId(cl.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 border ${
                      clusterId === cl.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cl.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Card</span>
          </button>
        </form>
      </div>
    </div>
  );
};
