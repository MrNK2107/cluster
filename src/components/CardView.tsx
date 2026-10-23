import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  MoreVertical, 
  Move, 
  Palette, 
  Tag, 
  ExternalLink, 
  Minus, 
  Copy, 
  Layers 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { CardData, CardColor, TodoItem, BookmarkItem, Cluster } from '../types';
import { COLOR_MAP } from '../utils/storage';

interface CardViewProps {
  card: CardData;
  clusters: Cluster[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: Partial<CardData>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartDrag: (e: React.MouseEvent, cardId: string) => void;
  onStartConnect?: (cardId: string) => void;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  clusters,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartDrag,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [showAddBookmark, setShowAddBookmark] = useState(false);

  const colors: CardColor[] = ['default', 'blue', 'green', 'yellow', 'purple', 'pink', 'amber', 'rose'];
  const colorTheme = COLOR_MAP[card.color] || COLOR_MAP.default;

  // Handle Todo toggle
  const handleToggleTodo = (todoId: string) => {
    if (!card.todos) return;
    const updated = card.todos.map((t) => {
      if (t.id === todoId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    onUpdate({ todos: updated });

    // Check if all are now completed
    const allDone = updated.length > 0 && updated.every((t) => t.completed);
    if (allDone) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const handleAddTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTodoText.trim()) return;

    // Extract any #tags from the todo text automatically
    const extractedTags = (newTodoText.match(/#[a-zA-Z0-9_-]+/g) || []);
    let updatedTags = [...card.tags];
    extractedTags.forEach(t => {
      if (!updatedTags.includes(t)) updatedTags.push(t);
    });

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: newTodoText.trim(),
      completed: false,
      priority: 'medium',
    };

    onUpdate({
      todos: [...(card.todos || []), newTodo],
      tags: updatedTags,
    });
    setNewTodoText('');
  };

  const handleDeleteTodo = (todoId: string) => {
    if (!card.todos) return;
    onUpdate({
      todos: card.todos.filter((t) => t.id !== todoId),
    });
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    let formatted = newTagInput.trim();
    if (!formatted.startsWith('#')) formatted = '#' + formatted;
    if (!card.tags.includes(formatted)) {
      onUpdate({ tags: [...card.tags, formatted] });
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      tags: card.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkTitle.trim() || !newBookmarkUrl.trim()) return;

    let url = newBookmarkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('tel:') && !url.startsWith('mailto:')) {
      url = 'https://' + url;
    }

    const newBm: BookmarkItem = {
      id: `bm-${Date.now()}`,
      title: newBookmarkTitle.trim(),
      url,
    };

    onUpdate({
      bookmarks: [...(card.bookmarks || []), newBm],
    });
    setNewBookmarkTitle('');
    setNewBookmarkUrl('');
    setShowAddBookmark(false);
  };

  const completedCount = card.todos ? card.todos.filter((t) => t.completed).length : 0;
  const totalCount = card.todos ? card.todos.length : 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'absolute',
        left: `${card.x}px`,
        top: `${card.y}px`,
        width: `${card.width || 320}px`,
        zIndex: isSelected ? 30 : 10,
      }}
      className={`group rounded-xl border shadow-sm transition-shadow duration-150 ${colorTheme.bg} ${colorTheme.border} ${
        isSelected ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:shadow-md'
      } flex flex-col`}
    >
      {/* Card Header & Drag Handle */}
      <div 
        onMouseDown={(e) => onStartDrag(e, card.id)}
        className={`flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing border-b ${colorTheme.border} ${colorTheme.header} rounded-t-xl select-none`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
          <Move className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0" />
          <input
            type="text"
            value={card.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Untitled card..."
            className="w-full bg-transparent font-medium text-sm text-slate-800 dark:text-slate-100 outline-none truncate focus:bg-white/40 dark:focus:bg-black/30 rounded px-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {/* Card Type Badge */}
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {card.type}
          </span>

          {/* Color button */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400"
              title="Change color"
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

          {/* More options menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate Card
                </button>

                {/* Move to Cluster */}
                <div className="px-3 py-1 font-semibold text-[10px] text-slate-400 uppercase border-t border-slate-100 dark:border-slate-700 mt-1">
                  Assign Cluster
                </div>
                <button
                  onClick={() => {
                    onUpdate({ clusterId: null });
                    setShowMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${
                    !card.clusterId ? 'text-indigo-600 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Layers className="w-3 h-3" /> Floating (None)
                </button>
                {clusters.map((cl) => (
                  <button
                    key={cl.id}
                    onClick={() => {
                      onUpdate({ clusterId: cl.id });
                      setShowMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 truncate ${
                      card.clusterId === cl.id ? 'text-indigo-600 font-semibold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span className="truncate">{cl.title}</span>
                  </button>
                ))}

                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Card
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags section */}
      <div 
        className="px-3 pt-2 flex flex-wrap items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {card.tags.map((tag) => (
          <span
            key={tag}
            className="group/tag inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 transition-colors cursor-pointer"
            onClick={() => handleRemoveTag(tag)}
            title="Click to remove tag"
          >
            {tag}
            <span className="ml-1 opacity-0 group-hover/tag:opacity-100 text-[10px]">×</span>
          </span>
        ))}
        {showTagInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTag();
                if (e.key === 'Escape') setShowTagInput(false);
              }}
              placeholder="#tag..."
              className="text-xs px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none w-20"
            />
            <button
              onClick={handleAddTag}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Tag className="w-2.5 h-2.5" /> +tag
          </button>
        )}
      </div>

      {/* Card Body depending on type */}
      <div 
        className="p-3 flex-1 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* TYPE 1: TODO LIST */}
        {card.type === 'todo' && (
          <div className="space-y-2">
            {/* Progress Bar */}
            {totalCount > 0 && (
              <div className="mb-2">
                <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                  <span>Progress ({completedCount}/{totalCount})</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Todo items */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {(card.todos || []).map((todo) => (
                <div
                  key={todo.id}
                  className="group/item flex items-start gap-2 text-sm rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => handleToggleTodo(todo.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0"
                  >
                    {todo.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={todo.text}
                    onChange={(e) => {
                      const updated = (card.todos || []).map((t) =>
                        t.id === todo.id ? { ...t, text: e.target.value } : t
                      );
                      onUpdate({ todos: updated });
                    }}
                    className={`flex-1 bg-transparent outline-none text-xs leading-relaxed ${
                      todo.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  />
                  {/* Priority selector */}
                  <button
                    onClick={() => {
                      const nextPrio = todo.priority === 'high' ? 'low' : todo.priority === 'low' ? 'medium' : 'high';
                      const updated = (card.todos || []).map((t) =>
                        t.id === todo.id ? { ...t, priority: nextPrio as any } : t
                      );
                      onUpdate({ todos: updated });
                    }}
                    className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded opacity-75 group-hover/item:opacity-100 ${
                      todo.priority === 'high'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : todo.priority === 'low'
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                    title="Click to toggle priority"
                  >
                    {todo.priority || 'med'}
                  </button>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-rose-500 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Todo input */}
            <form onSubmit={handleAddTodo} className="flex items-center gap-1.5 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Add task... (use #tags for auto-tagging)"
                className="w-full text-xs bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={!newTodoText.trim()}
                className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-30 shrink-0 font-medium"
              >
                Add
              </button>
            </form>
          </div>
        )}

        {/* TYPE 2: FREEFORM NOTE / SCRATCHPAD */}
        {card.type === 'note' && (
          <div className="flex flex-col flex-1">
            <textarea
              value={card.noteContent || ''}
              onChange={(e) => onUpdate({ noteContent: e.target.value })}
              placeholder="Start unstructured brain dump or notes here...&#10;- Use bullets&#10;- Quick memos&#10;- Markdown supported"
              rows={6}
              className="w-full h-full min-h-[120px] bg-transparent outline-none resize-y text-xs leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono"
            />
          </div>
        )}

        {/* TYPE 3: STICKY NOTE */}
        {card.type === 'sticky' && (
          <div className="flex flex-col flex-1">
            <textarea
              value={card.noteContent || ''}
              onChange={(e) => onUpdate({ noteContent: e.target.value })}
              placeholder="Important reminder, idea, or quote..."
              rows={4}
              className="w-full h-full min-h-[100px] bg-transparent outline-none resize-none text-sm leading-relaxed text-slate-800 dark:text-slate-900 placeholder-slate-500 font-sans italic"
            />
          </div>
        )}

        {/* TYPE 4: COUNTER */}
        {card.type === 'counter' && (
          <div className="flex flex-col items-center justify-center py-4 select-none">
            <input
              type="text"
              value={card.counterLabel || 'Items'}
              onChange={(e) => onUpdate({ counterLabel: e.target.value })}
              className="text-center font-medium text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-transparent outline-none mb-2"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={() => onUpdate({ counterValue: Math.max(0, (card.counterValue || 0) - 1) })}
                className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                {card.counterValue || 0}
              </div>
              <button
                onClick={() => onUpdate({ counterValue: (card.counterValue || 0) + 1 })}
                className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TYPE 5: BOOKMARKS & LINKS */}
        {card.type === 'links' && (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {(card.bookmarks || []).map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 group/link transition-colors"
                >
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{bm.title}</span>
                  </a>
                  <button
                    onClick={() => {
                      onUpdate({
                        bookmarks: (card.bookmarks || []).filter((b) => b.id !== bm.id),
                      });
                    }}
                    className="opacity-0 group-hover/link:opacity-100 text-slate-400 hover:text-rose-500 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {showAddBookmark ? (
              <form onSubmit={handleAddBookmark} className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                <input
                  type="text"
                  placeholder="Link Title (e.g. WiFi Portal)"
                  value={newBookmarkTitle}
                  onChange={(e) => setNewBookmarkTitle(e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 outline-none text-slate-800 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="URL or phone (https://... or tel:...)"
                  value={newBookmarkUrl}
                  onChange={(e) => setNewBookmarkUrl(e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 outline-none text-slate-800 dark:text-slate-100"
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAddBookmark(false)}
                    className="text-xs px-2 py-0.5 text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-0.5 bg-indigo-600 text-white rounded font-medium"
                  >
                    Save Link
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddBookmark(true)}
                className="w-full flex items-center justify-center gap-1 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-slate-400"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
