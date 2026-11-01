import React, { useCallback, useState } from 'react';
import {
  Check,
  Trash2,
  MoreHorizontal,
  Palette,
  Link2,
  Minus,
  Plus,
  Copy,
  Flag,
  CornerDownLeft,
  Tag,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { CardData, CardColor, TodoItem, BookmarkItem, Cluster } from '../types';
import { COLOR_MAP, COLOR_ORDER, colorTheme } from '../theme/colors';
import { safeHref, normalizeBookmarkUrl } from '../utils/validate';
import { IconButton, MenuDivider, MenuItem, MenuLabel, MenuPanel, useDismiss } from './ui';
import { cn } from '../utils/cn';

/* --------------------------------------------------------------------------
 * Shared card logic, used by both the canvas card and the list view.
 * ----------------------------------------------------------------------- */

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const celebrate = (y = 0.6) =>
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 32,
    origin: { y },
    colors: ['#3d5afe', '#ffc93c', '#19c39b', '#ec4899'],
    disableForReducedMotion: true,
  });

export const toggleTodo = (card: CardData, todoId: string): TodoItem[] => {
  const todos = (card.todos ?? []).map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t));
  const wasDone = (card.todos ?? []).every((t) => t.completed);
  if (!wasDone && todos.length > 0 && todos.every((t) => t.completed)) celebrate();
  return todos;
};

export const nextPriority = (p: TodoItem['priority']): TodoItem['priority'] =>
  p === 'high' ? 'low' : p === 'low' ? 'medium' : 'high';

/** Adds a task; `#tags` typed in the text are added to the card. */
export const addTodo = (card: CardData, text: string): Partial<CardData> => {
  const found = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  const tags = [...card.tags];
  for (const t of found) if (!tags.includes(t)) tags.push(t);
  return {
    todos: [...(card.todos ?? []), { id: newId('todo'), text: text.trim(), completed: false, priority: 'medium' }],
    tags,
  };
};

export const Checkbox: React.FC<{ checked: boolean; onToggle: () => void; size?: 'md' | 'lg' }> = ({ checked, onToggle, size = 'md' }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={checked ? 'Mark as not done' : 'Mark as done'}
    onClick={onToggle}
    className={cn(
      'shrink-0 rounded-full flex items-center justify-center transition-all duration-200',
      size === 'lg' ? 'w-6 h-6' : 'w-[18px] h-[18px]',
      checked
        ? 'bg-mint-500 text-white'
        : 'ring-[1.5px] ring-inset ring-ink-300 hover:ring-mint-500 hover:bg-mint-500/10 dark:ring-ink-600',
    )}
  >
    {checked && <Check className={cn('stroke-[3.5] animate-check', size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3')} />}
  </button>
);

export const Progress: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 rounded-full bg-ink-900/[0.07] dark:bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width,background-color] duration-500 ease-[var(--ease-out-quint)]', complete ? 'bg-mint-500' : 'bg-sun-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-[12px] font-semibold tabular-nums', complete ? 'text-mint-600 dark:text-mint-400' : 'text-ink-500 dark:text-ink-400')}>
        {complete ? 'All done' : `${done} of ${total}`}
      </span>
    </div>
  );
};

export const ColorSwatches: React.FC<{ value: CardColor; onPick: (c: CardColor) => void }> = ({ value, onPick }) => (
  <div className="grid grid-cols-4 gap-1.5 p-1">
    {COLOR_ORDER.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={COLOR_MAP[c].label}
        title={COLOR_MAP[c].label}
        onClick={() => onPick(c)}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110',
          COLOR_MAP[c].swatch,
          value === c && 'ring-2 ring-offset-2 ring-ink-900 ring-offset-white dark:ring-white dark:ring-offset-ink-900',
        )}
      >
        {value === c && <Check className={cn('w-4 h-4 stroke-[3]', c === 'yellow' ? 'text-ink-950' : 'text-white')} />}
      </button>
    ))}
  </div>
);

/* --------------------------------------------------------------------------
 * Canvas card
 * ----------------------------------------------------------------------- */

interface CardViewProps {
  card: CardData;
  clusters: Cluster[];
  isSelected: boolean;
  /** Laid out by its cluster rather than placed at x/y. */
  inFlow?: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onUpdate: (updated: Partial<CardData>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartDrag: (e: React.MouseEvent, cardId: string) => void;
}

const stop = {
  onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  clusters,
  isSelected,
  inFlow = false,
  isDragging = false,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartDrag,
}) => {
  const [popover, setPopover] = useState<'color' | 'menu' | null>(null);
  const closePopover = useCallback(() => setPopover(null), []);
  const popRef = useDismiss(popover !== null, closePopover);

  const [newTodo, setNewTodo] = useState('');
  const [tagDraft, setTagDraft] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<{ title: string; url: string } | null>(null);
  const [linkError, setLinkError] = useState(false);

  const theme = colorTheme(card.color);
  const isSticky = card.type === 'sticky';
  const todos = card.todos ?? [];
  const done = todos.filter((t) => t.completed).length;

  const commitTag = () => {
    const raw = (tagDraft ?? '').trim().replace(/\s+/g, '-');
    if (raw) {
      const tag = raw.startsWith('#') ? raw : `#${raw}`;
      if (!card.tags.includes(tag)) onUpdate({ tags: [...card.tags, tag] });
    }
    setTagDraft(null);
  };

  const commitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkDraft) return;
    const url = normalizeBookmarkUrl(linkDraft.url);
    if (!url) {
      setLinkError(true);
      return;
    }
    const bm: BookmarkItem = { id: newId('bm'), title: linkDraft.title.trim() || url.replace(/^\w+:(\/\/)?/, ''), url };
    onUpdate({ bookmarks: [...(card.bookmarks ?? []), bm] });
    setLinkDraft(null);
    setLinkError(false);
  };

  return (
    <article
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={
        inFlow
          ? { position: 'relative', zIndex: popover ? 30 : undefined, rotate: isSticky ? '-0.6deg' : undefined }
          : {
              position: 'absolute',
              left: card.x,
              top: card.y,
              width: card.width || 320,
              zIndex: isDragging ? 40 : isSelected || popover ? 30 : 10,
              rotate: isDragging ? '1.5deg' : isSticky ? '-0.6deg' : undefined,
            }
      }
      className={cn(
        'group/card flex flex-col rounded-[18px] transition-[box-shadow,transform] duration-200',
        isSticky ? theme.soft : 'bg-white dark:bg-ink-900 ring-1 ring-ink-900/[0.06] dark:ring-white/[0.07]',
        isDragging
          ? 'float-shadow scale-[1.02] cursor-grabbing'
          : isSelected
            ? 'glow-brand'
            : 'card-shadow dark:card-shadow-dark hover:card-shadow-hover',
      )}
    >
      {/* Header: drag handle */}
      <header
        onMouseDown={(e) => onStartDrag(e, card.id)}
        className="flex items-center gap-2 pl-4 pr-2 pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
      >
        {!isSticky && <span className={cn('w-2.5 h-2.5 shrink-0 rounded-full', theme.swatch)} aria-hidden="true" />}
        <input
          {...stop}
          value={card.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Untitled"
          aria-label="Card title"
          className={cn(
            'min-w-0 flex-1 bg-transparent outline-none rounded-md px-1 -mx-1 py-0.5 truncate font-display font-bold tracking-tight text-ink-950 dark:text-white placeholder:text-ink-400 focus:bg-ink-900/[0.05] dark:focus:bg-white/[0.06]',
            isSticky ? 'text-[13px] opacity-70' : 'text-[15px]',
          )}
        />
        <div
          ref={popRef}
          {...stop}
          className={cn(
            'relative flex items-center transition-opacity',
            isSelected || popover ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100 focus-within:opacity-100',
          )}
        >
          <IconButton label="Add tag" size="sm" onClick={() => setTagDraft('')}>
            <Tag className="w-4 h-4" />
          </IconButton>
          <IconButton label="Colour" size="sm" onClick={() => setPopover(popover === 'color' ? null : 'color')}>
            <Palette className="w-4 h-4" />
          </IconButton>
          <IconButton label="More" size="sm" onClick={() => setPopover(popover === 'menu' ? null : 'menu')}>
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>

          {popover === 'color' && (
            <MenuPanel className="right-0 top-full mt-1.5 min-w-0 w-auto">
              <ColorSwatches
                value={card.color}
                onPick={(c) => {
                  onUpdate({ color: c });
                  setPopover(null);
                }}
              />
            </MenuPanel>
          )}

          {popover === 'menu' && (
            <MenuPanel className="right-0 top-full mt-1.5 w-56 max-h-80 overflow-y-auto">
              <MenuItem
                icon={<Copy className="w-4 h-4" />}
                onClick={() => {
                  onDuplicate();
                  setPopover(null);
                }}
                hint={<span className="text-[11px] text-ink-400">Ctrl D</span>}
              >
                Duplicate
              </MenuItem>
              {clusters.length > 0 && (
                <>
                  <MenuDivider />
                  <MenuLabel>Move to cluster</MenuLabel>
                  <MenuItem
                    active={!card.clusterId}
                    icon={<span className="w-2.5 h-2.5 rounded-full ring-[1.5px] ring-ink-400" />}
                    onClick={() => {
                      onUpdate({ clusterId: null });
                      setPopover(null);
                    }}
                  >
                    No cluster
                  </MenuItem>
                  {clusters.map((cl) => (
                    <MenuItem
                      key={cl.id}
                      active={card.clusterId === cl.id}
                      icon={<span className={cn('w-2.5 h-2.5 rounded-full', colorTheme(cl.color).swatch)} />}
                      onClick={() => {
                        onUpdate({ clusterId: cl.id });
                        setPopover(null);
                      }}
                    >
                      {cl.title}
                    </MenuItem>
                  ))}
                </>
              )}
              <MenuDivider />
              <MenuItem
                tone="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  onDelete();
                  setPopover(null);
                }}
                hint={<span className="text-[11px] opacity-60">Del</span>}
              >
                Delete card
              </MenuItem>
            </MenuPanel>
          )}
        </div>
      </header>

      {/* Tags */}
      {(card.tags.length > 0 || tagDraft !== null) && (
        <div {...stop} className="flex flex-wrap items-center gap-1 px-4 pt-1">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'group/tag inline-flex items-center h-6 pl-2 pr-1 rounded-full text-[11.5px] font-semibold',
                isSticky ? 'bg-black/[0.07] text-ink-800' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
              )}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onUpdate({ tags: card.tags.filter((t) => t !== tag) })}
                className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center opacity-40 group-hover/tag:opacity-100 hover:bg-black/10 dark:hover:bg-white/15"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {tagDraft !== null && (
            <input
              autoFocus
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={commitTag}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTag();
                if (e.key === 'Escape') setTagDraft(null);
              }}
              placeholder="#tag"
              aria-label="New tag"
              className="h-6 w-24 px-2 rounded-full text-[11.5px] font-semibold bg-transparent ring-1 ring-brand-500 outline-none text-ink-800 dark:text-ink-100"
            />
          )}
        </div>
      )}

      {/* Body */}
      <div {...stop} className="px-4 pt-2 pb-3.5 flex-1 flex flex-col">
        {card.type === 'todo' && (
          <div>
            {todos.length > 0 && (
              <div className="pb-2">
                <Progress done={done} total={todos.length} />
              </div>
            )}
            <ul className="max-h-80 overflow-y-auto -mx-2">
              {todos.map((todo) => (
                <li key={todo.id} className="group/item flex items-start gap-2.5 rounded-lg px-2 min-h-9 [&>button]:mt-[7px] [&>button:not([role=checkbox])]:mt-1 hover:bg-ink-900/[0.035] dark:hover:bg-white/[0.04]">
                  <Checkbox checked={todo.completed} onToggle={() => onUpdate({ todos: toggleTodo(card, todo.id) })} />
                  <textarea
                    rows={1}
                    value={todo.text}
                    aria-label="Task"
                    onChange={(e) =>
                      onUpdate({ todos: todos.map((t) => (t.id === todo.id ? { ...t, text: e.target.value } : t)) })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLTextAreaElement).blur();
                      }
                      if (e.key === 'Backspace' && !todo.text) onUpdate({ todos: todos.filter((t) => t.id !== todo.id) });
                    }}
                    className={cn(
                      'min-w-0 flex-1 resize-none [field-sizing:content] leading-snug bg-transparent outline-none text-[14px] py-1.5 transition-colors',
                      todo.completed ? 'line-through decoration-ink-300 text-ink-400 dark:text-ink-500' : 'text-ink-800 dark:text-ink-100',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({ todos: todos.map((t) => (t.id === todo.id ? { ...t, priority: nextPriority(t.priority) } : t)) })
                    }
                    aria-label={`Priority: ${todo.priority ?? 'medium'}. Click to change.`}
                    title={`Priority: ${todo.priority ?? 'medium'}`}
                    className={cn(
                      'w-6 h-6 shrink-0 rounded-md flex items-center justify-center transition-opacity',
                      todo.priority === 'high'
                        ? 'text-rose-500'
                        : todo.priority === 'low'
                          ? 'text-ink-300 opacity-0 group-hover/item:opacity-100'
                          : 'text-ink-300 opacity-0 group-hover/item:opacity-100 hover:text-ink-500',
                    )}
                  >
                    <Flag className={cn('w-3.5 h-3.5', todo.priority === 'high' && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ todos: todos.filter((t) => t.id !== todo.id) })}
                    aria-label="Delete task"
                    className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-ink-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTodo.trim()) return;
                onUpdate(addTodo(card, newTodo));
                setNewTodo('');
              }}
              className="mt-1 -mx-2 flex items-center gap-2.5 rounded-lg px-2 min-h-9 focus-within:bg-ink-900/[0.035] dark:focus-within:bg-white/[0.04]"
            >
              <Plus className="w-[18px] h-[18px] shrink-0 text-ink-300 dark:text-ink-600" />
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a task"
                aria-label="Add a task"
                className="min-w-0 flex-1 bg-transparent outline-none text-[14px] py-1.5 text-ink-800 dark:text-ink-100 placeholder:text-ink-400"
              />
              {newTodo.trim() && (
                <button type="submit" aria-label="Add task" className="w-6 h-6 rounded-md flex items-center justify-center bg-brand-600 text-white animate-pop-in">
                  <CornerDownLeft className="w-3.5 h-3.5" />
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
            rows={6}
            className="w-full min-h-[132px] bg-transparent outline-none resize-y text-[14px] leading-relaxed text-ink-800 dark:text-ink-100 placeholder:text-ink-400"
          />
        )}

        {isSticky && (
          <textarea
            value={card.noteContent || ''}
            onChange={(e) => onUpdate({ noteContent: e.target.value })}
            placeholder="A thought worth keeping…"
            aria-label="Sticky note"
            rows={4}
            className="w-full min-h-[112px] bg-transparent outline-none resize-none font-display text-[19px] font-semibold leading-snug tracking-tight text-ink-950 dark:text-white placeholder:text-ink-950/35 dark:placeholder:text-white/35"
          />
        )}

        {card.type === 'counter' && (
          <div className="flex flex-col items-center pt-1 pb-2 select-none">
            <input
              value={card.counterLabel ?? ''}
              onChange={(e) => onUpdate({ counterLabel: e.target.value })}
              placeholder="What are you counting?"
              aria-label="Counter label"
              className="w-full text-center bg-transparent outline-none text-[13px] font-semibold text-ink-500 dark:text-ink-400 placeholder:text-ink-300"
            />
            <div className="mt-2 flex items-center gap-6">
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => onUpdate({ counterValue: Math.max(0, (card.counterValue || 0) - 1) })}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 active:scale-90 transition-all"
              >
                <Minus className="w-5 h-5" />
              </button>
              <output className="min-w-[2ch] text-center font-display text-6xl font-extrabold tracking-tight tabular-nums text-ink-950 dark:text-white">
                {card.counterValue || 0}
              </output>
              <button
                type="button"
                aria-label="Increase"
                onClick={() => onUpdate({ counterValue: (card.counterValue || 0) + 1 })}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-brand-600 text-white hover:bg-brand-700 active:scale-90 transition-all shadow-[0_10px_20px_-10px] shadow-brand-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {card.type === 'links' && (
          <div className="space-y-1">
            {(card.bookmarks ?? []).map((bm) => (
              <div key={bm.id} className="group/link -mx-2 flex items-center gap-2.5 rounded-lg px-2 min-h-10 hover:bg-ink-900/[0.035] dark:hover:bg-white/[0.04]">
                <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Link2 className="w-3.5 h-3.5" />
                </span>
                <a
                  href={safeHref(bm.url)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-800 dark:text-ink-100 hover:text-brand-600 dark:hover:text-brand-300"
                >
                  {bm.title}
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${bm.title}`}
                  onClick={() => onUpdate({ bookmarks: (card.bookmarks ?? []).filter((b) => b.id !== bm.id) })}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-ink-300 hover:text-rose-500 opacity-0 group-hover/link:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {linkDraft ? (
              <form onSubmit={commitLink} className="pt-1 space-y-2 animate-pop-in">
                <input
                  autoFocus
                  value={linkDraft.url}
                  onChange={(e) => {
                    setLinkDraft({ ...linkDraft, url: e.target.value });
                    setLinkError(false);
                  }}
                  placeholder="Paste a link, email or phone"
                  aria-label="Link address"
                  aria-invalid={linkError}
                  className={cn(
                    'w-full h-10 px-3 rounded-lg text-[14px] bg-ink-50 dark:bg-ink-950 outline-none ring-1 ring-inset text-ink-900 dark:text-white placeholder:text-ink-400 focus:ring-2',
                    linkError ? 'ring-rose-400 focus:ring-rose-500' : 'ring-ink-200 dark:ring-ink-700 focus:ring-brand-500',
                  )}
                />
                <input
                  value={linkDraft.title}
                  onChange={(e) => setLinkDraft({ ...linkDraft, title: e.target.value })}
                  placeholder="Name (optional)"
                  aria-label="Link name"
                  className="w-full h-10 px-3 rounded-lg text-[14px] bg-ink-50 dark:bg-ink-950 outline-none ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 text-ink-900 dark:text-white placeholder:text-ink-400"
                />
                {linkError && <p className="text-[12px] font-medium text-rose-600 dark:text-rose-400">That doesn’t look like a link. Try https://…</p>}
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => setLinkDraft(null)} className="h-8 px-3 rounded-lg text-[13px] font-semibold text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                    Cancel
                  </button>
                  <button type="submit" className="h-8 px-3 rounded-lg text-[13px] font-semibold bg-brand-600 text-white hover:bg-brand-700">
                    Save link
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setLinkDraft({ title: '', url: '' })}
                className="-mx-2 w-[calc(100%+1rem)] flex items-center gap-2.5 rounded-lg px-2 min-h-9 text-[14px] text-ink-400 hover:text-ink-700 hover:bg-ink-900/[0.035] dark:hover:text-ink-200 dark:hover:bg-white/[0.04]"
              >
                <Plus className="w-[18px] h-[18px]" /> Add a link
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
