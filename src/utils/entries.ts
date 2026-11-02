import type { CardData, TodoItem } from '../types';

/**
 * Reading a card as an "entry" in the table view: its date, a clean name,
 * its steps (to-dos) and its notes (to-do lines that are really information,
 * written with a leading ℹ️ / 💡 / 📝).
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "⏰ Nov 14 · Name", "Nov 14 - Name", "Dec 3, 2026 | Name" */
const DATE_PREFIX = /^\s*(?:[^\p{L}\p{N}\s]+\s*)?([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\s*[·•|–—-]\s*/u;
const NOTE_LINE = /^\s*(?:ℹ️|ℹ|💡|📝|🗒️)/u;

export const isNoteLine = (todo: TodoItem) => NOTE_LINE.test(todo.text);

export function entrySteps(card: CardData): TodoItem[] {
  return (card.todos ?? []).filter((t) => !isNoteLine(t));
}

export function entryNotes(card: CardData): string[] {
  return (card.todos ?? []).filter(isNoteLine).map((t) => t.text.replace(NOTE_LINE, '').trim());
}

/** The card title without a leading date, which the table shows in its own column. */
export function entryName(card: CardData): string {
  const stripped = card.title.replace(DATE_PREFIX, '').trim();
  return stripped && parseTitleDate(card.title) !== null ? stripped : card.title;
}

function parseTitleDate(title: string, now = new Date()): number | null {
  const m = DATE_PREFIX.exec(title);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
  const day = Number(m[2]);
  if (month < 0 || day < 1 || day > 31) return null;
  if (m[3]) return Date.UTC(Number(m[3]), month, day);
  // No year: the next occurrence, allowing a couple of months in the past.
  const year = now.getUTCFullYear();
  const t = Date.UTC(year, month, day);
  return t < now.getTime() - 60 * 86_400_000 ? Date.UTC(year + 1, month, day) : t;
}

function parseIsoDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** The entry's next deadline: the earliest open step with a due date, else the date in its title. */
export function entryDate(card: CardData, now = new Date()): number | null {
  const steps = entrySteps(card).filter((t) => t.dueDate);
  const open = steps.filter((t) => !t.completed);
  const dates = (open.length ? open : steps).map((t) => parseIsoDay(t.dueDate!)).filter((d): d is number => d !== null);
  if (dates.length) return Math.min(...dates);
  return parseTitleDate(card.title, now);
}

export function formatEntryDate(t: number, now = new Date()): string {
  const d = new Date(t);
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

/** 'overdue' | 'soon' (within a week) | null, for open entries only. */
export function dateUrgency(card: CardData, t: number | null, now = new Date()): 'overdue' | 'soon' | null {
  if (t === null) return null;
  const steps = entrySteps(card);
  if (steps.length && steps.every((s) => s.completed)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (t < today) return 'overdue';
  if (t - today <= 7 * 86_400_000) return 'soon';
  return null;
}

/** The entry's main link: its own, else its only bookmark. */
export function entryLink(card: CardData): string | null {
  if (card.link) return card.link;
  if (card.bookmarks?.length === 1) return card.bookmarks[0].url;
  return null;
}

export const linkHost = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol.startsWith('http') ? u.hostname.replace(/^www\./, '') : url.replace(/^\w+:/, '');
  } catch {
    return url;
  }
};
