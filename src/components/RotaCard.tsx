import React, { useContext, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ListOrdered, ThumbsUp, UserMinus } from 'lucide-react';
import type { CardData, RotaData } from '../types';
import {
  DEFAULT_MEMBERS,
  addDays,
  dayLabel,
  isAccepted,
  newRota,
  restartRota,
  rotaWindow,
  toDay,
  toggleApproved,
  toggleAway,
  toggleDone,
  toggleEveryoneAway,
  toggleVote,
} from '../utils/rota';
import { RotaPeopleContext } from '../utils/rotaContext';
import type { RotaDay } from '../utils/rota';
import { cn } from '../utils/cn';

const UPCOMING = 7;

const describe = (d: RotaDay): string | null => {
  if (d.reason === 'cover') return `covering for ${d.coveringFor}`;
  if (d.reason === 'payback') return 'paying back a missed day';
  return null;
};

const DayRow: React.FC<{
  day: RotaDay;
  members: string[];
  today: string;
  isToday: boolean;
  /** Today or earlier: the cleaning can be claimed and voted on. */
  canClaim: boolean;
  accepted: boolean;
  votes: number;
  voters: number;
  iVoted: boolean;
  /** False for someone who can only view the space. */
  canVote: boolean;
  isOwner: boolean;
  ownerApproved: boolean;
  onVote: () => void;
  onApprove: () => void;
  open: boolean;
  onToggleOpen: () => void;
  onAway: (member: string) => void;
  onEveryoneAway: () => void;
  onDone: () => void;
  big: boolean;
}> = ({ day, members, today, isToday, canClaim, accepted, votes, voters, iVoted, canVote, isOwner, ownerApproved, onVote, onApprove, open, onToggleOpen, onAway, onEveryoneAway, onDone, big }) => {
  const note = describe(day);
  return (
    <li className={cn('rounded-xl', isToday && 'bg-brand-600/[0.07] dark:bg-brand-400/10')}>
      <div className={cn('flex items-center gap-2.5 px-2.5', big ? 'min-h-12' : 'min-h-10')}>
        {canClaim && day.person ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={day.done}
            aria-label={day.done ? 'Take back: I cleaned' : 'Mark as cleaned'}
            onClick={onDone}
            className={cn(
              'shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all',
              accepted ? 'bg-mint-500 text-white' : day.done ? 'bg-amber-400 text-white' : 'ring-[1.5px] ring-inset ring-ink-300 hover:ring-mint-500 dark:ring-ink-600',
            )}
          >
            {day.done && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
          </button>
        ) : (
          <span className="shrink-0 w-6" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="w-[4.5rem] shrink-0 text-[12px] font-semibold text-ink-500 dark:text-ink-400">{dayLabel(day.date, today)}</span>
            <span
              className={cn(
                'truncate font-semibold',
                isToday ? 'text-[16px] text-ink-950 dark:text-white' : 'text-[14px] text-ink-800 dark:text-ink-100',
                accepted && 'text-ink-500 dark:text-ink-400',
              )}
            >
              {day.person ?? 'Skipped · everyone away'}
            </span>
          </div>
          {note && <div className="pl-[4.5rem] -mt-px text-[12px] text-amber-600 dark:text-amber-400 truncate">{note}</div>}
        </div>
        {day.away.length > 0 && !open && (
          <span className="shrink-0 text-[11px] font-semibold text-ink-400">{day.away.length} away</span>
        )}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-label={`Who is away ${dayLabel(day.date, today).toLowerCase()}`}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-700 hover:bg-ink-900/[0.05] dark:hover:text-ink-200 dark:hover:bg-white/10"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {day.done && day.person && (
        <div className="px-2.5 pb-2 pl-[2.75rem] flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'text-[12px] font-semibold',
              accepted ? 'text-mint-600 dark:text-mint-400' : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {accepted
              ? ownerApproved ? 'Accepted · owner approved' : 'Accepted'
              : voters > 1 ? `Waiting for approval · ${votes} of ${voters} agreed` : 'Waiting for approval'}
          </span>
          {voters > 1 && canVote && (
            <button
              type="button"
              aria-pressed={iVoted}
              onClick={onVote}
              className={cn(
                'h-8 px-3 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors',
                iVoted ? 'bg-mint-500 text-white' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700',
              )}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> {iVoted ? 'You said yes' : 'Yes, it’s clean'}
            </button>
          )}
          {isOwner && voters > 1 && (
            <button
              type="button"
              aria-pressed={ownerApproved}
              onClick={onApprove}
              className={cn(
                'h-8 px-3 rounded-full text-[13px] font-semibold transition-colors',
                ownerApproved ? 'bg-brand-600 text-white' : 'bg-ink-900 text-white dark:bg-white dark:text-ink-950',
              )}
            >
              {ownerApproved ? 'Approved' : 'Approve now'}
            </button>
          )}
        </div>
      )}
      {open && (
        <div className="px-2.5 pb-2.5 pl-[2.75rem]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 dark:text-ink-400">
            <UserMinus className="w-3.5 h-3.5" /> Who is away?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const away = day.away.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={away}
                  onClick={() => onAway(m)}
                  className={cn(
                    'h-8 px-3 rounded-full text-[13px] font-semibold transition-colors',
                    away
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700',
                  )}
                >
                  {m}
                  {away && ' · away'}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onEveryoneAway}
              className="h-8 px-3 rounded-full text-[13px] font-semibold text-ink-600 ring-1 ring-inset ring-dashed ring-ink-300 hover:bg-ink-50 dark:text-ink-300 dark:ring-ink-600 dark:hover:bg-ink-800"
            >
              {members.every((m) => day.away.includes(m)) ? 'Undo skip' : 'Everyone away · skip day'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

/** The body of a chore-rota card: who cleans today and over the next week. */
export const RotaBody: React.FC<{
  card: CardData;
  onUpdate: (u: Partial<CardData>) => void;
  /** Larger tap targets for phones. */
  big?: boolean;
}> = ({ card, onUpdate, big = false }) => {
  const rota: RotaData = useMemo(() => card.rota ?? newRota(DEFAULT_MEMBERS), [card.rota]);
  const today = toDay();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);

  const me = useContext(RotaPeopleContext);
  const peopleIds = useMemo(() => (me?.people ?? []).map((p) => p.userId), [me]);
  const isOwner = me?.isOwner ?? true;

  // Yesterday stays on screen so a late "yes" still counts.
  const yesterday = addDays(today, -1);
  const from = rota.startDate > yesterday ? today : yesterday;
  const { days, owed } = useMemo(() => rotaWindow(rota, from, UPCOMING + 1, today), [rota, from, today]);
  const owing = rota.members.filter((m) => owed[m] > 0);
  const save = (next: RotaData) => onUpdate({ rota: next });
  const todayPerson = days.find((d) => d.date === today)?.person ?? null;
  /** Moves someone in the order, keeping whoever is up today up today. */
  const reorder = (from: number, to: number) => {
    const order = [...rota.members];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    save(restartRota(rota, today, order, todayPerson ?? order[0]));
  };

  return (
    <div className="-mx-1.5 select-none">
      <ul className="space-y-0.5">
        {days.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            members={rota.members}
            today={today}
            isToday={day.date === today}
            canClaim={day.date <= today}
            accepted={isAccepted(rota, day.date, peopleIds)}
            votes={(rota.votes[day.date] ?? []).filter((id) => peopleIds.includes(id)).length}
            voters={peopleIds.length}
            canVote={me?.canEdit ?? true}
            iVoted={!!me && (rota.votes[day.date] ?? []).includes(me.myId)}
            isOwner={isOwner}
            ownerApproved={rota.approved[day.date] === true}
            onVote={() => me && save(toggleVote(rota, day.date, me.myId))}
            onApprove={() => save(toggleApproved(rota, day.date))}
            open={openDay === day.date}
            onToggleOpen={() => setOpenDay(openDay === day.date ? null : day.date)}
            onAway={(m) => save(toggleAway(rota, day.date, m))}
            onEveryoneAway={() => save(toggleEveryoneAway(rota, day.date))}
            onDone={() => save(toggleDone(rota, day.date))}
            big={big}
          />
        ))}
      </ul>
      <p className="mt-2 px-2.5 text-[12px] leading-snug text-ink-500 dark:text-ink-400">
        {owing.length > 0
          ? owing.map((m) => `${m} owes ${owed[m]} ${owed[m] === 1 ? 'day' : 'days'}`).join(' · ') + '. They take the next day they are in.'
          : 'Everyone is square. If someone is away, the next person covers and the one who was away pays it back.'}
      </p>

      <div className="mt-1 px-1.5">
        <button
          type="button"
          aria-expanded={ordering}
          onClick={() => setOrdering((o) => !o)}
          className="h-8 px-2 -ml-0.5 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-800 hover:bg-ink-900/[0.05] dark:text-ink-400 dark:hover:text-ink-100 dark:hover:bg-white/10"
        >
          <ListOrdered className="w-4 h-4" /> Order &amp; who’s up today
        </button>
        {ordering && (
          <div className="mt-1 rounded-xl p-2 bg-ink-900/[0.035] dark:bg-white/[0.04]">
            <ul className="space-y-1">
              {rota.members.map((m, i) => (
                <li key={m} className="flex items-center gap-1.5">
                  <span className="w-5 text-center text-[12px] font-bold text-ink-400 tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-800 dark:text-ink-100">{m}</span>
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label={`Move ${m} up`}
                    onClick={() => reorder(i, i - 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-900/[0.07] disabled:opacity-30 dark:hover:bg-white/10"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === rota.members.length - 1}
                    aria-label={`Move ${m} down`}
                    onClick={() => reorder(i, i + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-900/[0.07] disabled:opacity-30 dark:hover:bg-white/10"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => save(restartRota(rota, today, rota.members, m))}
                    disabled={todayPerson === m}
                    className="h-8 px-2.5 rounded-lg text-[12px] font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500 dark:disabled:bg-ink-700 dark:disabled:text-ink-300"
                  >
                    {todayPerson === m ? 'Up today' : 'Start today'}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] leading-snug text-ink-500 dark:text-ink-400">
              Changing the order or who’s up restarts the cycle from today. Days owed before now are cleared.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
