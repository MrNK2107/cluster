import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { BoardDocument, CardData, CardType, TodoItem } from '../types';
import { COLOR_MAP } from '../utils/storage';
import { safeHref } from '../utils/validate';

interface MobileFeedViewProps {
  document: BoardDocument;
  activeTagFilter: string | null;
  onUpdateCard: (id: string, updated: Partial<CardData>) => void;
  onDeleteCard: (id: string) => void;
  onUpdateCluster: (id: string, updated: any) => void;
  onDeleteCluster: (id: string) => void;
  onOpenQuickAdd: (type: CardType, clusterId?: string) => void;
}

export const MobileFeedView: React.FC<MobileFeedViewProps> = ({
  document,
  activeTagFilter,
  onUpdateCard,
  onDeleteCard,
  onDeleteCluster,
  onOpenQuickAdd,
}) => {
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string | null>(null);
  const [newTodoInput, setNewTodoInput] = useState<{ [cardId: string]: string }>({});
  const [collapsedClusters, setCollapsedClusters] = useState<{ [id: string]: boolean }>({});

  const toggleClusterCollapse = (id: string) => {
    setCollapsedClusters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleTodo = (card: CardData, todoId: string) => {
    if (!card.todos) return;
    const updated = card.todos.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t));
    onUpdateCard(card.id, { todos: updated });

    if (updated.length > 0 && updated.every(t => t.completed)) {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    }
  };

  const handleAddTodoToCard = (card: CardData) => {
    const text = (newTodoInput[card.id] || '').trim();
    if (!text) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      completed: false,
      priority: 'medium',
    };

    onUpdateCard(card.id, {
      todos: [...(card.todos || []), newTodo],
    });

    setNewTodoInput(prev => ({ ...prev, [card.id]: '' }));
  };

  // Filter cards by active tag if any
  const filteredCards = document.cards.filter((c) => {
    if (activeTagFilter && !c.tags.includes(activeTagFilter)) return false;
    return true;
  });

  const clusterCardsMap = new Map<string, CardData[]>();
  const floatingCards: CardData[] = [];

  filteredCards.forEach((c) => {
    if (c.clusterId) {
      if (!clusterCardsMap.has(c.clusterId)) {
        clusterCardsMap.set(c.clusterId, []);
      }
      clusterCardsMap.get(c.clusterId)!.push(c);
    } else {
      floatingCards.push(c);
    }
  });

  // Clusters to display based on cluster filter pill
  const clustersToDisplay = selectedClusterFilter
    ? document.clusters.filter((cl) => cl.id === selectedClusterFilter)
    : document.clusters;

  const showFloating = !selectedClusterFilter || selectedClusterFilter === 'floating';

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 py-5 pb-28 space-y-5 max-w-2xl mx-auto">
      {/* Cluster Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
        <button
          onClick={() => setSelectedClusterFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            selectedClusterFilter === null
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          All Clusters ({document.cards.length})
        </button>
        {document.clusters.map((cl) => {
          const count = (clusterCardsMap.get(cl.id) || []).length;
          const isSelected = selectedClusterFilter === cl.id;
          return (
            <button
              key={cl.id}
              onClick={() => setSelectedClusterFilter(cl.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{cl.title}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
        {floatingCards.length > 0 && (
          <button
            onClick={() => setSelectedClusterFilter('floating')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedClusterFilter === 'floating'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Loose / Floating ({floatingCards.length})
          </button>
        )}
      </div>

      {/* Render Clusters */}
      {clustersToDisplay.map((cluster) => {
        const cards = clusterCardsMap.get(cluster.id) || [];
        const isCollapsed = collapsedClusters[cluster.id];
        const colorTheme = COLOR_MAP[cluster.color] || COLOR_MAP.default;

        let totalTodos = 0;
        let doneTodos = 0;
        cards.forEach((c) => {
          if (c.todos) {
            totalTodos += c.todos.length;
            doneTodos += c.todos.filter((t) => t.completed).length;
          }
        });

        return (
          <section
            key={cluster.id}
            className={`rounded-2xl border ${colorTheme.border} ${colorTheme.bg} overflow-hidden shadow-xs transition-all`}
          >
            {/* Cluster Header */}
            <div
              onClick={() => toggleClusterCollapse(cluster.id)}
              className={`px-4 py-3 flex items-center justify-between cursor-pointer border-b ${colorTheme.border} ${colorTheme.header}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                  {cluster.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {totalTodos > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {doneTodos}/{totalTodos} done
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuickAdd('todo', cluster.id);
                  }}
                  className="p-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                  title="Add card"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCluster(cluster.id);
                  }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-500"
                  title="Delete cluster"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {/* Cluster Cards Body */}
            {!isCollapsed && (
              <div className="p-4 space-y-3">
                {cards.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No cards in this cluster yet.{' '}
                    <button
                      onClick={() => onOpenQuickAdd('todo', cluster.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold underline ml-1"
                    >
                      + Add Todo List
                    </button>
                  </div>
                ) : (
                  cards.map((card) => renderMobileCard(card))
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Floating Cards (outside any cluster) */}
      {showFloating && floatingCards.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              📌 Loose Notes & Tasks
            </h3>
            <button
              onClick={() => onOpenQuickAdd('todo')}
              className="p-1.5 rounded-md bg-indigo-600 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {floatingCards.map((card) => renderMobileCard(card))}
          </div>
        </section>
      )}
    </div>
  );

  function renderMobileCard(card: CardData) {
    const colorTheme = COLOR_MAP[card.color] || COLOR_MAP.default;
    const completedCount = card.todos ? card.todos.filter((t) => t.completed).length : 0;
    const totalCount = card.todos ? card.todos.length : 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
      <div
        key={card.id}
        className={`rounded-xl border ${colorTheme.border} ${colorTheme.bg} p-4 shadow-xs space-y-3`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
              {card.type}
            </span>
            <input
              type="text"
              value={card.title}
              onChange={(e) => onUpdateCard(card.id, { title: e.target.value })}
              className="font-bold text-sm text-slate-800 dark:text-slate-100 bg-transparent outline-none truncate w-full"
            />
          </div>
          <button
            onClick={() => onDeleteCard(card.id)}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Card Body by Type */}
        {card.type === 'todo' && (
          <div className="space-y-2 pt-1">
            {totalCount > 0 && (
              <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
            <div className="space-y-1">
              {(card.todos || []).map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 py-1.5 min-h-[40px] rounded-lg active:bg-black/5 dark:active:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => handleToggleTodo(card, todo.id)}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0"
                  >
                    {todo.completed ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={todo.text}
                    onChange={(e) => {
                      const updated = (card.todos || []).map((t) =>
                        t.id === todo.id ? { ...t, text: e.target.value } : t
                      );
                      onUpdateCard(card.id, { todos: updated });
                    }}
                    className={`flex-1 text-xs bg-transparent outline-none ${
                      todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                    }`}
                  />
                  {todo.priority && (
                    <span
                      className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded shrink-0 ${
                        todo.priority === 'high'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {todo.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Inline add task input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTodoToCard(card);
              }}
              className="flex items-center gap-2 pt-3 border-t border-black/5 dark:border-white/5"
            >
              <input
                type="text"
                placeholder="+ Add task..."
                value={newTodoInput[card.id] || ''}
                onChange={(e) =>
                  setNewTodoInput((prev) => ({ ...prev, [card.id]: e.target.value }))
                }
                className="flex-1 text-xs bg-transparent outline-none text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={!(newTodoInput[card.id] || '').trim()}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-30"
              >
                Add
              </button>
            </form>
          </div>
        )}

        {(card.type === 'note' || card.type === 'sticky') && (
          <textarea
            value={card.noteContent || ''}
            onChange={(e) => onUpdateCard(card.id, { noteContent: e.target.value })}
            placeholder="Type your unstructured thoughts here..."
            rows={4}
            className="w-full text-xs bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans"
          />
        )}

        {card.type === 'counter' && (
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {card.counterLabel || 'Counter'}:
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateCard(card.id, { counterValue: Math.max(0, (card.counterValue || 0) - 1) })}
                className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {card.counterValue || 0}
              </span>
              <button
                onClick={() => onUpdateCard(card.id, { counterValue: (card.counterValue || 0) + 1 })}
                className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>
        )}

        {card.type === 'links' && (
          <div className="space-y-1.5 pt-1">
            {(card.bookmarks || []).map((bm) => (
              <a
                key={bm.id}
                href={safeHref(bm.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 text-xs text-indigo-600 dark:text-indigo-400 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{bm.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
};
