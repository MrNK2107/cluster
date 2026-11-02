import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, ExternalLink, Link2, Search, Trash2, ThumbsDown, X, Check } from 'lucide-react';
import type { BoardDocument, CardData } from '../types';
import { colorTheme } from '../theme/colors';
import { normalizeBookmarkUrl } from '../utils/validate';
import {
  dateUrgency,
  entryDate,
  entryDateWord,
  entryLink,
  entryName,
  entryNotes,
  entrySteps,
  formatEntryDate,
  linkHost,
} from '../utils/entries';
import { Checkbox, toggleTodo } from './CardView';
import { cn } from '../utils/cn';

type SortKey = 'date' | 'name' | 'status' | 'progress';

interface TableViewProps {
  document: BoardDocument;
  myId: string;
  activeTagFilter: string | null;
  onSelectTagFilter: (tag: string | null) => void;
  onUpdateCard: (id: string, updated: Partial<CardData>) => void;
  /** Deletes the card, or in a shared space proposes rejecting it. */
  onDeleteCard: (id: string) => void;
  onAgreeReject: (id: string) => void;
  onKeep: (id: string) => void;
}

const NO_STATUS = '__none__';

const SortHeader: React.FC<{
  label: string;
  k: SortKey;
  sort: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
  className?: string;
}> = ({ label, k, sort, asc, onSort, className }) => (
  <button
    type="button"
    onClick={() => onSort(k)}
    className={cn('inline-flex items-center gap-1 font-semibold hover:text-ink-900 dark:hover:text-white', sort === k && 'text-ink-900 dark:text-white', className)}
  >
    {label}
    {sort === k && (asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
  </button>
);

const LinkEditor: React.FC<{ card: CardData; onSave: (link: string | undefined) => void }> = ({ card, onSave }) => {
  const [value, setValue] = useState(card.link ?? '');
  const [bad, setBad] = useState(false);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) {
          onSave(undefined);
          return;
        }
        const url = normalizeBookmarkUrl(value);
        if (!url) {
          setBad(true);
          return;
        }
        setBad(false);
        onSave(url);
      }}
    >
      <Link2 className="w-4 h-4 shrink-0 text-ink-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste a link (registration page, job post…)"
        aria-label="Link"
        className={cn(
          'min-w-0 flex-1 h-9 px-3 rounded-lg text-[13px] bg-white dark:bg-ink-950 text-ink-900 dark:text-white placeholder:text-ink-400 ring-1 ring-inset outline-none focus:ring-2 focus:ring-brand-500',
          bad ? 'ring-rose-400' : 'ring-ink-200 dark:ring-ink-700',
        )}
      />
      <button type="submit" className="h-9 px-3 rounded-lg text-[13px] font-semibold bg-ink-900 text-white dark:bg-white dark:text-ink-950">
        Save
      </button>
    </form>
  );
};

const Row: React.FC<{
  card: CardData;
  doc: BoardDocument;
  myId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updated: Partial<CardData>) => void;
  onDelete: () => void;
  onAgree: () => void;
  onKeep: () => void;
  onTag: (tag: string) => void;
}> = ({ card, doc, myId, expanded, onToggleExpand, onUpdate, onDelete, onAgree, onKeep, onTag }) => {
  const [confirming, setConfirming] = useState(false);
  const people = doc.share?.people ?? [];
  const shared = people.length > 1;
  const date = entryDate(card);
  const dateWord = date === null ? entryDateWord(card) : null;
  const urgency = dateUrgency(card, date);
  const steps = entrySteps(card);
  const done = steps.filter((s) => s.completed).length;
  const link = entryLink(card);
  const cluster = doc.clusters.find((c) => c.id === card.clusterId);
  const r = card.rejection;
  const iAgreed = Boolean(r?.approvals.includes(myId));
  const name = entryName(card);

  return (
    <li
      className={cn(
        'border-b border-ink-200/70 dark:border-white/[0.06] transition-colors',
        r ? 'bg-rose-50/80 dark:bg-rose-500/[0.07]' : expanded ? 'bg-white dark:bg-ink-900' : 'hover:bg-white/70 dark:hover:bg-white/[0.03]',
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[84px_minmax(0,1fr)_230px_56px_64px_36px] items-start gap-x-3 gap-y-1 px-3 md:px-4 py-3">
        {/* Date */}
        <div
          className={cn(
            'order-2 md:order-none col-span-2 md:col-span-1 text-[12.5px] md:text-[13px] font-semibold tabular-nums md:pt-0.5',
            date === null && !dateWord && 'max-md:hidden',
            urgency === 'overdue' ? 'text-rose-600 dark:text-rose-400' : urgency === 'soon' ? 'text-amber-600 dark:text-amber-400' : 'text-ink-500 dark:text-ink-400',
          )}
        >
          {date !== null ? (
            formatEntryDate(date)
          ) : dateWord ? (
            <span className="font-medium text-ink-500 dark:text-ink-400">{dateWord}</span>
          ) : (
            <span className="text-ink-300 dark:text-ink-600">—</span>
          )}
          {urgency === 'overdue' && <span className="ml-1 font-medium md:block md:ml-0 text-[11px]">Past</span>}
        </div>

        {/* Name, tags */}
        <div className="order-1 md:order-none min-w-0">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="group flex items-start gap-1.5 text-left w-full"
          >
            <ChevronRight
              className={cn('w-4 h-4 mt-0.5 shrink-0 text-ink-400 transition-transform', expanded && 'rotate-90')}
            />
            <span className="text-[14.5px] leading-snug font-semibold text-ink-900 dark:text-white break-words group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {name}
            </span>
          </button>
          {card.tags.length > 0 && (
            <div className="mt-1.5 ml-5 flex flex-wrap gap-1">
              {card.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTag(t)}
                  className="h-5 px-1.5 rounded-md text-[11px] font-semibold bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-800 dark:bg-ink-800 dark:text-ink-400 dark:hover:text-white"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="order-3 md:order-none col-span-2 md:col-span-1">
          <label className="relative block">
            <span className="sr-only">Status</span>
            {cluster && (
              <span className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none', colorTheme(cluster.color).swatch)} />
            )}
            <select
              value={card.clusterId ?? NO_STATUS}
              onChange={(e) => onUpdate({ clusterId: e.target.value === NO_STATUS ? null : e.target.value })}
              className={cn(
                'w-full h-8 pr-6 rounded-lg text-[12.5px] font-medium truncate bg-ink-100/80 text-ink-700 dark:bg-ink-800/80 dark:text-ink-200 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer',
                cluster ? 'pl-6' : 'pl-2.5',
              )}
            >
              <option value={NO_STATUS}>No column</option>
              {doc.clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Link */}
        <div className="order-1 md:order-none flex md:justify-center row-span-1">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              title={link}
              aria-label={`Open link for ${name}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-brand-600 hover:bg-brand-600/10 dark:text-brand-300 dark:hover:bg-brand-500/15"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onToggleExpand}
              title="Add a link"
              aria-label={`Add a link for ${name}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink-300 hover:text-ink-600 hover:bg-ink-100 dark:text-ink-600 dark:hover:text-ink-300 dark:hover:bg-ink-800"
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="hidden md:flex flex-col items-end gap-1 pt-1">
          {steps.length > 0 ? (
            <>
              <span className="text-[12px] font-semibold tabular-nums text-ink-500 dark:text-ink-400">
                {done}/{steps.length}
              </span>
              <span className="w-12 h-1 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden">
                <span
                  className={cn('block h-full rounded-full', done === steps.length ? 'bg-mint-500' : 'bg-brand-500')}
                  style={{ width: `${(done / steps.length) * 100}%` }}
                />
              </span>
            </>
          ) : null}
        </div>

        {/* Delete / reject */}
        <div className="hidden md:flex justify-end">
          {!r && (
            <button
              type="button"
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setConfirming(false);
                onDelete();
              }}
              onBlur={() => setConfirming(false)}
              title={shared ? 'Propose rejecting' : 'Delete'}
              aria-label={confirming ? (shared ? `Confirm: propose rejecting ${name}` : `Confirm: delete ${name}`) : shared ? `Propose rejecting ${name}` : `Delete ${name}`}
              className={cn(
                'inline-flex items-center justify-center h-8 rounded-lg transition-colors',
                confirming
                  ? 'px-2 text-[12px] font-semibold bg-rose-600 text-white'
                  : 'w-8 text-ink-300 hover:text-rose-600 hover:bg-rose-500/10 dark:text-ink-600 dark:hover:text-rose-400',
              )}
            >
              {confirming ? (shared ? 'Reject?' : 'Delete?') : shared ? <ThumbsDown className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Pending rejection */}
      {r && (
        <div className="flex flex-wrap items-center gap-2 px-3 md:px-4 md:pl-[112px] pb-3 -mt-1">
          <span className="text-[12.5px] text-rose-700 dark:text-rose-300">
            <strong className="font-semibold">{r.byId === myId ? 'You' : r.byEmail || 'Someone'}</strong> proposed rejecting this ·{' '}
            {r.approvals.length} of {people.length} agreed
          </span>
          {!iAgreed && (
            <button
              type="button"
              onClick={onAgree}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] font-semibold bg-rose-600 text-white hover:bg-rose-700"
            >
              <Check className="w-3.5 h-3.5" /> Agree to reject
            </button>
          )}
          <button
            type="button"
            onClick={onKeep}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] font-semibold ring-1 ring-inset ring-rose-300 text-rose-700 hover:bg-rose-100 dark:ring-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <X className="w-3.5 h-3.5" /> {r.byId === myId ? 'Cancel' : 'Keep it'}
          </button>
        </div>
      )}

      {/* Details */}
      {expanded && (
        <div className="px-3 md:px-4 md:pl-[112px] pb-4 space-y-4">
          <LinkEditor key={card.link ?? ''} card={card} onSave={(l) => onUpdate({ link: l })} />

          {entryNotes(card).length > 0 && (
            <ul className="space-y-1">
              {entryNotes(card).map((n, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-ink-600 dark:text-ink-300">
                  {n}
                </li>
              ))}
            </ul>
          )}
          {card.noteContent && (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-600 dark:text-ink-300">{card.noteContent}</p>
          )}

          {steps.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {steps.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5">
                  <Checkbox checked={s.completed} onToggle={() => onUpdate({ todos: toggleTodo(card, s.id) })} />
                  <span className={cn('text-[13.5px] leading-snug pt-0.5', s.completed ? 'text-ink-400 line-through' : 'text-ink-800 dark:text-ink-100')}>
                    {s.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {(card.bookmarks?.length ?? 0) > 1 && (
            <ul className="space-y-1">
              {card.bookmarks!.map((b) => (
                <li key={b.id}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-brand-700 hover:underline dark:text-brand-300 break-words">
                    {b.title}
                  </a>
                  <span className="ml-2 text-[12px] text-ink-400">{linkHost(b.url)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Phone: actions the narrow row hides */}
          {!r && (
            <button
              type="button"
              onClick={onDelete}
              className="md:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 dark:text-rose-400 dark:ring-rose-500/30"
            >
              {shared ? <ThumbsDown className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              {shared ? 'Propose rejecting' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </li>
  );
};

export const TableView: React.FC<TableViewProps> = ({
  document: doc,
  myId,
  activeTagFilter,
  onSelectTagFilter,
  onUpdateCard,
  onDeleteCard,
  onAgreeReject,
  onKeep,
}) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('date');
  const [asc, setAsc] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Big cards that only hold a list of links are not entries themselves.
  const entries = useMemo(() => doc.cards.filter((c) => !(c.type === 'links' && (c.bookmarks?.length ?? 0) > 1)), [doc.cards]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of entries) m.set(c.clusterId ?? NO_STATUS, (m.get(c.clusterId ?? NO_STATUS) ?? 0) + 1);
    return m;
  }, [entries]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const clusterIndex = new Map(doc.clusters.map((c, i) => [c.id, i]));
    const list = entries.filter(
      (c) =>
        (status === null || (c.clusterId ?? NO_STATUS) === status) &&
        (!activeTagFilter || c.tags.includes(activeTagFilter)) &&
        (!q || c.title.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))),
    );
    const key = (c: CardData): number | string => {
      if (sort === 'date') return entryDate(c) ?? Number.MAX_SAFE_INTEGER;
      if (sort === 'name') return entryName(c).toLowerCase();
      if (sort === 'status') return clusterIndex.get(c.clusterId ?? '') ?? 999;
      const steps = entrySteps(c);
      return steps.length ? steps.filter((s) => s.completed).length / steps.length : -1;
    };
    return list
      .map((c) => ({ c, k: key(c) }))
      .sort((a, b) => {
        const d = a.k < b.k ? -1 : a.k > b.k ? 1 : entryName(a.c).localeCompare(entryName(b.c));
        return asc ? d : -d;
      })
      .map((x) => x.c);
  }, [entries, doc.clusters, status, activeTagFilter, query, sort, asc]);

  const onSort = (k: SortKey) => {
    if (k === sort) setAsc((a) => !a);
    else {
      setSort(k);
      setAsc(true);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filterChip = (value: string | null, label: React.ReactNode, count: number, swatch?: string) => (
    <button
      key={value ?? 'all'}
      type="button"
      onClick={() => setStatus(value)}
      aria-pressed={status === value}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors',
        status === value
          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950'
          : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-ink-300 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700',
      )}
    >
      {swatch && <span className={cn('w-2 h-2 rounded-full', swatch)} />}
      {label}
      <span className={cn('tabular-nums', status === value ? 'opacity-70' : 'text-ink-400')}>{count}</span>
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Search + status filter */}
        <div className="flex flex-col gap-3 mb-4">
          <label className="relative block max-w-md">
            <span className="sr-only">Search entries</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${entries.length} entries`}
              className="w-full h-10 pl-9 pr-3 rounded-xl text-[14px] bg-white dark:bg-ink-900 text-ink-900 dark:text-white placeholder:text-ink-400 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
            {filterChip(null, 'All', entries.length)}
            {doc.clusters.map((c) => filterChip(c.id, c.title, counts.get(c.id) ?? 0, colorTheme(c.color).swatch))}
            {(counts.get(NO_STATUS) ?? 0) > 0 && filterChip(NO_STATUS, 'No column', counts.get(NO_STATUS) ?? 0)}
          </div>
        </div>

        <div className="rounded-2xl bg-ink-50/60 dark:bg-ink-950 ring-1 ring-ink-200/80 dark:ring-white/[0.07] overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[84px_minmax(0,1fr)_230px_56px_64px_36px] gap-x-3 px-4 h-10 items-center text-[12px] text-ink-500 dark:text-ink-400 bg-white/80 dark:bg-ink-900/80 border-b border-ink-200/70 dark:border-white/[0.06]">
            <SortHeader label="Date" k="date" sort={sort} asc={asc} onSort={onSort} />
            <SortHeader label="Name" k="name" sort={sort} asc={asc} onSort={onSort} className="pl-5" />
            <SortHeader label="Status" k="status" sort={sort} asc={asc} onSort={onSort} />
            <span className="text-center font-semibold">Link</span>
            <SortHeader label="Done" k="progress" sort={sort} asc={asc} onSort={onSort} className="justify-self-end" />
            <span />
          </div>

          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[14px] text-ink-500 dark:text-ink-400">
              {entries.length === 0 ? 'No entries in this space yet.' : 'Nothing matches.'}
            </p>
          ) : (
            <ul aria-label="Entries">
              {rows.map((c) => (
                <Row
                  key={c.id}
                  card={c}
                  doc={doc}
                  myId={myId}
                  expanded={expanded.has(c.id)}
                  onToggleExpand={() => toggle(c.id)}
                  onUpdate={(u) => onUpdateCard(c.id, u)}
                  onDelete={() => onDeleteCard(c.id)}
                  onAgree={() => onAgreeReject(c.id)}
                  onKeep={() => onKeep(c.id)}
                  onTag={(t) => onSelectTagFilter(activeTagFilter === t ? null : t)}
                />
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3 text-[12px] text-ink-400 dark:text-ink-500">
          {rows.length} of {entries.length} shown
          {doc.share && doc.share.people.length > 1 && ' · In a shared space, an entry is deleted only when everyone agrees to reject it.'}
        </p>
      </div>
    </div>
  );
};
