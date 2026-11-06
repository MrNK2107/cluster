import type { RotaData } from '../types';

/**
 * A daily chore rota that copes with people being away.
 *
 * The turn moves round the members in order. When the person whose turn it
 * is happens to be away, the next person who is in takes their place and the
 * absent person now owes one day. The first day the debtor is back they do the
 * chore (the turn order doesn't move on a payback day), so everyone ends up
 * doing the same number of days over time.
 *
 * Everything is worked out from the start date and the "away" marks, so it
 * is never stored twice and cannot drift out of step between people.
 */

export type DayReason = 'turn' | 'cover' | 'payback';

export interface RotaDay {
  date: string;
  /** Who does it, or null when nobody is in. */
  person: string | null;
  reason: DayReason | null;
  /** For a cover day: whose turn it really was. */
  coveringFor?: string;
  away: string[];
  done: boolean;
}

export interface RotaState {
  /** Days still owed by each member after the last day simulated. */
  owed: Record<string, number>;
  /** Chores actually scheduled to each member so far (up to and including the last day). */
  counts: Record<string, number>;
  days: RotaDay[];
}

const DAY_MS = 86_400_000;
/** Safety limit so a bad start date can't make the page do years of work. */
const MAX_DAYS = 3660;

/** Local calendar day as YYYY-MM-DD. */
export const toDay = (d: Date = new Date()): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const toUtc = (day: string): number => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const addDays = (day: string, n: number): string =>
  new Date(toUtc(day) + n * DAY_MS).toISOString().slice(0, 10);

export const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const dayLabel = (day: string, today: string): string => {
  const diff = Math.round((toUtc(day) - toUtc(today)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(toUtc(day)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

/**
 * Works out the rota from its start date through `through` (inclusive).
 * `days` is every day from the start; use `rotaWindow` for just the ones to show.
 */
export function computeRota(rota: RotaData, through: string): RotaState {
  const members = rota.members;
  const owed: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));
  const counts: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));
  const days: RotaDay[] = [];
  if (members.length === 0) return { owed, counts, days };

  const total = Math.min(MAX_DAYS, Math.floor((toUtc(through) - toUtc(rota.startDate)) / DAY_MS) + 1);
  // The place in the order, which only moves on a normal or cover day.
  let turn = 0;

  for (let i = 0; i < total; i++) {
    const date = addDays(rota.startDate, i);
    const away = (rota.away[date] ?? []).filter((m) => members.includes(m));
    const isIn = (m: string) => !away.includes(m);
    const done = rota.done[date] === true;

    // 1. Someone who owes a day does it as soon as they are back.
    const debtor = members.find((m) => owed[m] > 0 && isIn(m));
    if (debtor) {
      owed[debtor] -= 1;
      counts[debtor] += 1;
      days.push({ date, person: debtor, reason: 'payback', away, done });
      continue;
    }

    // 2. Otherwise it's the next person's turn.
    const scheduled = members[turn % members.length];
    if (isIn(scheduled)) {
      turn += 1;
      counts[scheduled] += 1;
      days.push({ date, person: scheduled, reason: 'turn', away, done });
      continue;
    }

    // 3. They're away: the next person who is in covers, and the absent one owes.
    let cover: string | null = null;
    for (let step = 1; step < members.length; step++) {
      const candidate = members[(turn + step) % members.length];
      if (isIn(candidate)) {
        cover = candidate;
        break;
      }
    }
    if (cover) {
      turn += 1;
      owed[scheduled] += 1;
      counts[cover] += 1;
      days.push({ date, person: cover, reason: 'cover', coveringFor: scheduled, away, done });
    } else {
      // Nobody is in: a skipped day. Nothing is owed and the order doesn't move on.
      days.push({ date, person: null, reason: null, away, done });
    }
  }

  return { owed, counts, days };
}

/** The days from `from` for `count` days, plus where things stand through today. */
export function rotaWindow(rota: RotaData, from: string, count: number, today: string = from) {
  const through = addDays(from, count - 1) > today ? addDays(from, count - 1) : today;
  const state = computeRota(rota, through);
  return {
    days: state.days.filter((d) => d.date >= from).slice(0, count),
    /** What each person still owes after today, the number the page shows. */
    owed: computeRota(rota, today).owed,
    counts: computeRota(rota, today).counts,
  };
}

export function newRota(members: string[], today: string = toDay()): RotaData {
  return { members, startDate: today, away: {}, done: {}, votes: {}, approved: {} };
}

export const DEFAULT_MEMBERS = ['Aman', 'Paul', 'Nanda', 'Venkat'];

export function toggleAway(rota: RotaData, date: string, member: string): RotaData {
  const current = rota.away[date] ?? [];
  const next = current.includes(member) ? current.filter((m) => m !== member) : [...current, member];
  const away = { ...rota.away };
  if (next.length) away[date] = next;
  else delete away[date];
  return { ...rota, away };
}

/** The cleaner marks the day cleaned (or takes it back, which clears any votes). */
export function toggleDone(rota: RotaData, date: string): RotaData {
  const done = { ...rota.done };
  if (done[date]) {
    delete done[date];
    const votes = { ...rota.votes };
    const approved = { ...rota.approved };
    delete votes[date];
    delete approved[date];
    return { ...rota, done, votes, approved };
  }
  done[date] = true;
  return { ...rota, done };
}

/** A person says yes (or takes their yes back) to a day's cleaning. */
export function toggleVote(rota: RotaData, date: string, userId: string): RotaData {
  const current = rota.votes[date] ?? [];
  const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
  const votes = { ...rota.votes };
  if (next.length) votes[date] = next;
  else delete votes[date];
  return { ...rota, votes };
}

export function toggleApproved(rota: RotaData, date: string): RotaData {
  const approved = { ...rota.approved };
  if (approved[date]) delete approved[date];
  else approved[date] = true;
  return { ...rota, approved };
}

/**
 * A cleaning counts once it has been claimed and either the owner approved
 * it or every person in the space said yes. On your own, claiming is enough.
 */
export function isAccepted(rota: RotaData, date: string, peopleIds: string[]): boolean {
  if (!rota.done[date]) return false;
  if (rota.approved[date]) return true;
  if (peopleIds.length <= 1) return true;
  const votes = rota.votes[date] ?? [];
  return peopleIds.every((id) => votes.includes(id));
}

/**
 * Starts the cycle again from `today` in the given order, with `first` up
 * today. Earlier days are no longer counted, so days owed are cleared; marks
 * already made for today and later are kept.
 */
export function restartRota(rota: RotaData, today: string, order: string[], first: string): RotaData {
  const i = order.indexOf(first);
  const members = i > 0 ? [...order.slice(i), ...order.slice(0, i)] : order;
  return { ...rota, members, startDate: today };
}

/** Marks everyone away (or clears it), which skips the day with nothing owed. */
export function toggleEveryoneAway(rota: RotaData, date: string): RotaData {
  const all = rota.members.every((m) => (rota.away[date] ?? []).includes(m));
  const away = { ...rota.away };
  if (all) delete away[date];
  else away[date] = [...rota.members];
  return { ...rota, away };
}
