import React, { useCallback, useState } from 'react';
import { Plus, Trash2, ChevronDown, Link2, Minus, MoreHorizontal, Flag, CornerDownLeft } from 'lucide-react';
import type { BoardDocument, CardData, CardType, Cluster } from '../types';
import { colorTheme } from '../theme/colors';
import { safeHref } from '../utils/validate';
import { Checkbox, Progress, addTodo, nextPriority, toggleTodo } from './CardView';
import { IconButton, MenuItem, MenuPanel, useDismiss } from './ui';
import { cn } from '../utils/cn';
import { RotaBody } from './RotaCard';

interface MobileFeedViewProps {
  document: BoardDocument;
  activeTagFilter: string | null;
  onUpdateCard: (id: string, updated: Partial<CardData>) => void;
  onDeleteCard: (id: string) => void;
  onUpdateCluster: (id: string, updated: Partial<Cluster>) => void;
  onDeleteCluster: (id: string) => void;
  onOpenQuickAdd: (type: CardType, clusterId?: string) => void;
}

const LOOSE = '__loose__';

/* --------------------------------------------------------------------------
 * One card in the list
 * ----------------------------------------------------------------------- */

const ListCard: React.FC<{
  card: CardData;
  onUpdate: (u: Partial<CardData>) => void;
  onDelete: () => void;
}> = ({ card, onUpdate, onDelete }) => {
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const menuRef = useDismiss(menu, closeMenu);
  const theme = colorTheme(card.color);
  const isSticky = card.type === 'sticky';
  const todos = card.todos ?? [];

  return (
    <article
      className={cn(
        'rounded-2xl p-4 pt-3',
        isSticky ? theme.soft : 'bg-white dark:bg-ink-900 ring-1 ring-ink-900/[0.06] dark:ring-white/[0.07] card-shadow dark:card-shadow-dark',
      )}
    >
      <header className="flex items-center gap-2.5">
        {!isSticky && <span className={cn('w-2.5 h-2.5 shrink-0 rounded-full', theme.swatch)} aria-hidden="true" />}
        <input
          value={card.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          aria-label="Card title"
          placeholder="Untitled"
          className={cn(
            'min-w-0 flex-1 bg-transparent outline-none font-display font-bold tracking-tight text-ink-950 dark:text-white placeholder:text-ink-400',
            isSticky ? 'text-[13px] opacity-70' : 'text-[16px]',
          )}
        />
        <div ref={menuRef} className="relative -mr-2">
          <IconButton label="Card options" onClick={() => setMenu((m) => !m)}>
            <MoreHorizontal className="w-[18px] h-[18px]" />
          </IconButton>
          {menu && (
            <MenuPanel className="right-0 top-full mt-1 w-44">
              <MenuItem tone="danger" icon={<Trash2 className="w-4 h-4" />} onClick={onDelete}>
                Delete card
              </MenuItem>
            </MenuPanel>
          )}
        </div>
      </header>

      {card.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {card.tags.map((t) => (
            <span
              key={t}
              className={cn(
                'inline-flex items-center h-6 px-2 rounded-full text-[12px] font-semibold',
                isSticky ? 'bg-black/[0.07] text-ink-800' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
              )}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {card.type === 'todo' && (
        <div className="mt-3">
          {todos.length > 0 && <Progress done={todos.filter((t) => t.completed).length} total={todos.length} />}
          <ul className="mt-1.5 -mx-1">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-start gap-3 min-h-11 px-1 [&>button[role=checkbox]]:mt-[10px] [&>button:not([role=checkbox])]:mt-0.5">
                <Checkbox size="lg" checked={todo.completed} onToggle={() => onUpdate({ todos: toggleTodo(card, todo.id) })} />
                <textarea
                  rows={1}
                  value={todo.text}
                  aria-label="Task"
                  onChange={(e) => onUpdate({ todos: todos.map((t) => (t.id === todo.id ? { ...t, text: e.target.value } : t)) })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLTextAreaElement).blur();
                    }
                    if (e.key === 'Backspace' && !todo.text) onUpdate({ todos: todos.filter((t) => t.id !== todo.id) });
                  }}
                  className={cn(
                    'min-w-0 flex-1 resize-none [field-sizing:content] leading-snug bg-transparent outline-none text-[15px] py-2.5',
                    todo.completed ? 'line-through decoration-ink-300 text-ink-400 dark:text-ink-500' : 'text-ink-800 dark:text-ink-100',
                  )}
                />
                <button
                  type="button"
                  aria-label={`Priority: ${todo.priority ?? 'medium'}. Tap to change.`}
                  onClick={() => onUpdate({ todos: todos.map((t) => (t.id === todo.id ? { ...t, priority: nextPriority(t.priority) } : t)) })}
                  className={cn(
                    'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center',
                    todo.priority === 'high' ? 'text-rose-500' : 'text-ink-300 dark:text-ink-600',
                  )}
                >
                  <Flag className={cn('w-4 h-4', todo.priority === 'high' && 'fill-current')} />
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onUpdate(addTodo(card, draft));
              setDraft('');
            }}
            className="mt-1 flex items-center gap-3 min-h-11 rounded-xl px-1 -mx-1"
          >
            <span className="w-6 h-6 shrink-0 flex items-center justify-center text-ink-300 dark:text-ink-600">
              <Plus className="w-5 h-5" />
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task"
              aria-label="Add a task"
              enterKeyHint="done"
              className="min-w-0 flex-1 bg-transparent outline-none text-[15px] py-2 text-ink-800 dark:text-ink-100 placeholder:text-ink-400"
            />
            {draft.trim() && (
              <button type="submit" aria-label="Add task" className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-600 text-white animate-pop-in">
                <CornerDownLeft className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      )}

      {card.type === 'note' && (
        <textarea
          value={card.noteContent || ''}
          onChange={(e) => onUpdate({ noteContent: e.target.value })}
          placeholder="Write anything…"
          aria-label="Note"
          rows={4}
          className="mt-2 w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed text-ink-800 dark:text-ink-100 placeholder:text-ink-400"
        />
      )}

      {isSticky && (
        <textarea
          value={card.noteContent || ''}
          onChange={(e) => onUpdate({ noteContent: e.target.value })}
          placeholder="A thought worth keeping…"
          aria-label="Sticky note"
          rows={3}
          className="mt-1 w-full bg-transparent outline-none resize-none font-display text-[19px] font-semibold leading-snug tracking-tight text-ink-950 dark:text-white placeholder:text-ink-950/35"
        />
      )}

      {card.type === 'counter' && (
        <div className="mt-2 flex items-center justify-between gap-4">
          <input
            value={card.counterLabel ?? ''}
            onChange={(e) => onUpdate({ counterLabel: e.target.value })}
            placeholder="What are you counting?"
            aria-label="Counter label"
            className="min-w-0 flex-1 bg-transparent outline-none text-[14px] font-semibold text-ink-500 dark:text-ink-400 placeholder:text-ink-300"
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => onUpdate({ counterValue: Math.max(0, (card.counterValue || 0) - 1) })}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200 active:scale-90 transition-transform"
            >
              <Minus className="w-5 h-5" />
            </button>
            <output className="min-w-[2ch] text-center font-display text-4xl font-extrabold tabular-nums text-ink-950 dark:text-white">
              {card.counterValue || 0}
            </output>
            <button
              type="button"
              aria-label="Increase"
              onClick={() => onUpdate({ counterValue: (card.counterValue || 0) + 1 })}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-brand-600 text-white active:scale-90 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {card.type === 'rota' && (
        <div className="mt-2">
          <RotaBody card={card} onUpdate={onUpdate} big />
        </div>
      )}

      {card.type === 'links' && (
        <div className="mt-2 space-y-1">
          {(card.bookmarks ?? []).length === 0 && <p className="text-[14px] text-ink-400">No links yet. Add them from the canvas.</p>}
          {(card.bookmarks ?? []).map((bm) => (
            <a
              key={bm.id}
              href={safeHref(bm.url)}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 min-h-11 -mx-1 px-1 rounded-xl text-[15px] font-semibold text-ink-800 dark:text-ink-100 active:bg-ink-100 dark:active:bg-ink-800"
            >
              <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Link2 className="w-4 h-4" />
              </span>
              <span className="truncate">{bm.title}</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
};

/* --------------------------------------------------------------------------
 * List view
 * ----------------------------------------------------------------------- */

export const MobileFeedView: React.FC<MobileFeedViewProps> = ({
  document,
  activeTagFilter,
  onUpdateCard,
  onDeleteCard,
  onUpdateCluster,
  onDeleteCluster,
  onOpenQuickAdd,
}) => {
  const [filter, setFilter] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const visible = document.cards.filter((c) => !activeTagFilter || c.tags.includes(activeTagFilter));
  const byCluster = new Map<string, CardData[]>();
  for (const c of visible) {
    const key = c.clusterId && document.clusters.some((cl) => cl.id === c.clusterId) ? c.clusterId : LOOSE;
    byCluster.set(key, [...(byCluster.get(key) ?? []), c]);
  }
  const loose = byCluster.get(LOOSE) ?? [];

  const groups: { id: string; cluster: Cluster | null }[] = [
    ...document.clusters.map((cl) => ({ id: cl.id, cluster: cl })),
    ...(loose.length ? [{ id: LOOSE, cluster: null }] : []),
  ].filter((g) => !filter || g.id === filter);

  const chip = (id: string | null, label: string, count: number, swatch?: string) => (
    <button
      key={id ?? 'all'}
      type="button"
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={cn(
        'shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors',
        filter === id
          ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
          : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700',
      )}
    >
      {swatch && <span className={cn('w-2 h-2 rounded-full', swatch)} />}
      <span className="max-w-40 truncate">{label}</span>
      <span className="tabular-nums opacity-55">{count}</span>
    </button>
  );

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-32 md:pb-12">
        {/* Cluster filter */}
        <nav aria-label="Filter by cluster" className="-mx-4 px-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {chip(null, 'Everything', visible.length)}
          {document.clusters.map((cl) => chip(cl.id, cl.title || 'Untitled', byCluster.get(cl.id)?.length ?? 0, colorTheme(cl.color).swatch))}
          {loose.length > 0 && chip(LOOSE, 'Not in a cluster', loose.length, 'bg-ink-300')}
        </nav>

        {groups.length === 0 && (
          <div className="py-24 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Nothing here yet</h2>
            <p className="mt-2 text-[15px] text-ink-500 dark:text-ink-400">Add your first to-do list to get going.</p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('todo')}
              className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-600 text-white font-semibold"
            >
              <Plus className="w-4 h-4" /> New to-do list
            </button>
          </div>
        )}

        <div className="mt-6 space-y-9">
          {groups.map(({ id, cluster }) => {
            const cards = byCluster.get(id) ?? [];
            const theme = colorTheme(cluster?.color);
            const collapsed = cluster?.collapsed ?? false;
            let total = 0;
            let done = 0;
            for (const c of cards) {
              total += c.todos?.length ?? 0;
              done += c.todos?.filter((t) => t.completed).length ?? 0;
            }

            return (
              <section key={id} aria-label={cluster?.title ?? 'Not in a cluster'}>
                <header className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => cluster && onUpdateCluster(cluster.id, { collapsed: !collapsed })}
                    aria-expanded={!collapsed}
                    className={cn(
                      'min-w-0 inline-flex items-center gap-2 h-9 pl-4 pr-3 rounded-full',
                      cluster ? theme.tab : 'bg-ink-200 text-ink-800 dark:bg-ink-800 dark:text-ink-100',
                    )}
                  >
                    <span className="truncate font-display text-[15px] font-bold tracking-tight">{cluster?.title || (cluster ? 'Untitled' : 'Not in a cluster')}</span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums opacity-75">{total ? `${done}/${total}` : cards.length}</span>
                    {cluster && <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', !collapsed && 'rotate-180')} />}
                  </button>
                  <span className="flex-1" />
                  <IconButton label="Add card here" onClick={() => onOpenQuickAdd('todo', cluster?.id)}>
                    <Plus className="w-[18px] h-[18px]" />
                  </IconButton>
                  {cluster && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmDelete === cluster.id) {
                          onDeleteCluster(cluster.id);
                          setConfirmDelete(null);
                        } else {
                          setConfirmDelete(cluster.id);
                        }
                      }}
                      onBlur={() => setConfirmDelete(null)}
                      aria-label={confirmDelete === cluster.id ? 'Tap again to delete cluster' : 'Delete cluster'}
                      className={cn(
                        'h-9 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-all',
                        confirmDelete === cluster.id
                          ? 'px-3 bg-rose-500 text-white'
                          : 'w-9 text-ink-400 hover:text-rose-500 hover:bg-rose-500/10',
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                      {confirmDelete === cluster.id && 'Delete?'}
                    </button>
                  )}
                </header>

                {!collapsed && (
                  <div className="space-y-3">
                    {cards.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenQuickAdd('todo', cluster?.id)}
                        className="w-full flex items-center justify-center gap-2 h-16 rounded-2xl border-2 border-dashed border-ink-200 dark:border-ink-800 text-[14px] font-semibold text-ink-400 hover:text-ink-700 hover:border-ink-300 dark:hover:text-ink-200"
                      >
                        <Plus className="w-4 h-4" /> Add the first card
                      </button>
                    ) : (
                      cards.map((card) => (
                        <ListCard
                          key={card.id}
                          card={card}
                          onUpdate={(u) => onUpdateCard(card.id, u)}
                          onDelete={() => onDeleteCard(card.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
