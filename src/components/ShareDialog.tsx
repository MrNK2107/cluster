import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserPlus, X, LogOut, Lock, ShieldCheck } from 'lucide-react';
import type { BoardDocument, SpaceRole } from '../types';
import type { AuthUser } from '../utils/supabase';
import { fetchMembers, searchPeople, type Member, type Person } from '../utils/sharing';
import { stripLeadingEmoji } from './Sidebar';
import { Avatar } from './Avatar';
import { Button, Dialog, IconButton } from './ui';

interface ShareDialogProps {
  open: boolean;
  doc: BoardDocument;
  user: AuthUser;
  onClose: () => void;
  /** Each returns an error message, or null when it worked. */
  onAddPerson: (person: Person, role: SpaceRole) => Promise<string | null>;
  onChangeRole: (userId: string, role: SpaceRole) => Promise<string | null>;
  onRemovePerson: (userId: string) => Promise<string | null>;
  onStopSharing: () => Promise<string | null>;
  onLeave: () => Promise<string | null>;
}

const asUser = (p: { id: string; email: string; name?: string | null; avatarUrl?: string | null }): AuthUser => ({
  id: p.id,
  email: p.email,
  name: p.name ?? null,
  avatarUrl: p.avatarUrl ?? null,
});

const PersonRow: React.FC<{ person: AuthUser; note?: string; action?: React.ReactNode }> = ({ person, note, action }) => (
  <li className="flex items-center gap-3 py-2">
    <Avatar user={person} className="w-9 h-9 text-sm" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[14px] font-semibold text-ink-900 dark:text-white">{person.name || person.email}</span>
      {(person.name || note) && (
        <span className="block truncate text-[12px] text-ink-500 dark:text-ink-400">
          {[person.name ? person.email : null, note].filter(Boolean).join(' · ')}
        </span>
      )}
    </span>
    {action}
  </li>
);

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  doc,
  user,
  onClose,
  onAddPerson,
  onChangeRole,
  onRemovePerson,
  onStopSharing,
  onLeave,
}) => {
  const share = doc.share;
  const isOwner = !share || share.isOwner;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  /** What people are given when added; can be changed per person afterwards. */
  const [newRole, setNewRole] = useState<SpaceRole>('edit');
  const searchSeq = useRef(0);

  // Who is in the space now.
  const spaceId = share?.spaceId;
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmStop(false);
    if (!spaceId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    void fetchMembers(spaceId).then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error);
      setMembers(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, spaceId]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Search as the person types, a moment after they pause.
  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeq.current;
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchPeople(q);
      if (seq !== searchSeq.current) return;
      setSearching(false);
      if (res.error) setError(res.error);
      setResults(res.data);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const run = async (key: string, action: () => Promise<string | null>) => {
    setBusy(key);
    setError(null);
    const err = await action();
    setBusy(null);
    if (err) setError(err);
    return !err;
  };

  const add = async (person: Person) => {
    const ok = await run(`add:${person.id}`, () => onAddPerson(person, newRole));
    if (ok) {
      setMembers((m) => (m.some((x) => x.userId === person.id) ? m : [...m, { userId: person.id, email: person.email, role: newRole }]));
      setQuery('');
      setResults([]);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const visibleResults = results.filter((p) => !memberIds.has(p.id) && p.id !== share?.ownerId);
  const q = query.trim();
  const title = stripLeadingEmoji(doc.title, doc.icon);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Share “${title}”`}
      description={
        isOwner
          ? 'Choose whether each person can edit this space or only view it. Changes show up for everyone within a few seconds.'
          : `${share?.ownerEmail || 'Someone'} shared this space with you. ${share?.canEdit === false ? 'You can view it but not change it.' : 'You can edit it.'}`
      }
    >
      {isOwner && (
        <div>
          <label className="relative block">
            <span className="sr-only">Find people by email</span>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email"
              className="w-full h-12 pl-10 pr-10 rounded-xl text-[15px] bg-white dark:bg-ink-950 text-ink-900 dark:text-white placeholder:text-ink-400 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-ink-400" />}
          </label>

          <div role="radiogroup" aria-label="Access for the person you add" className="mt-3 inline-flex p-1 rounded-xl bg-ink-100 dark:bg-ink-800">
            {([['edit', 'Can edit'], ['view', 'View only']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={newRole === value}
                onClick={() => setNewRole(value)}
                className={
                  'h-8 px-3.5 rounded-lg text-[13px] font-semibold transition-colors ' +
                  (newRole === value
                    ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-950 dark:text-white'
                    : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100')
                }
              >
                {label}
              </button>
            ))}
          </div>

          {q.length > 0 && q.length < 3 && (
            <p className="mt-2 text-[12px] text-ink-400 dark:text-ink-500">Type at least 3 characters.</p>
          )}
          {q.length >= 3 && !searching && !error && visibleResults.length === 0 && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
              No one with an email starting “{q}”. They need to sign in to clustr once before you can add them.
            </p>
          )}
          {visibleResults.length > 0 && (
            <ul aria-label="Matching people" className="mt-2 divide-y divide-ink-100 dark:divide-ink-800">
              {visibleResults.map((p) => (
                <PersonRow
                  key={p.id}
                  person={asUser(p)}
                  action={
                    <Button size="sm" variant="primary" aria-label={`Add ${p.email}`} disabled={busy !== null} onClick={() => void add(p)}>
                      {busy === `add:${p.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Add
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="mt-5">
        <h3 className="mb-1 text-[13px] font-semibold text-ink-500 dark:text-ink-400">People with access</h3>
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {isOwner ? (
            <PersonRow person={user} note="Owner (you)" />
          ) : (
            <PersonRow person={asUser({ id: share!.ownerId, email: share!.ownerEmail })} note="Owner" />
          )}
          {members.map((m) => (
            <PersonRow
              key={m.userId}
              person={m.userId === user.id ? user : asUser({ id: m.userId, email: m.email })}
              note={m.userId === user.id ? (m.role === 'view' ? 'You · view only' : 'You') : m.role === 'view' ? 'View only' : 'Can edit'}
              action={
                isOwner ? (
                  <span className="flex items-center gap-1">
                  <select
                    aria-label={`Access for ${m.email}`}
                    value={m.role}
                    disabled={busy !== null}
                    onChange={(e) => {
                      const role = e.target.value as SpaceRole;
                      void run(`role:${m.userId}`, () => onChangeRole(m.userId, role)).then((ok) => {
                        if (ok) setMembers((list) => list.map((x) => (x.userId === m.userId ? { ...x, role } : x)));
                      });
                    }}
                    className="h-8 rounded-lg px-2 text-[13px] font-semibold bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">View only</option>
                  </select>
                  <IconButton
                    label={`Remove ${m.email}`}
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(`remove:${m.userId}`, () => onRemovePerson(m.userId)).then((ok) => {
                        if (ok) setMembers((list) => list.filter((x) => x.userId !== m.userId));
                      })
                    }
                  >
                    {busy === `remove:${m.userId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </IconButton>
                  </span>
                ) : undefined
              }
            />
          ))}
        </ul>
        {isOwner && members.length === 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-500 dark:text-ink-400">
            <Lock className="w-3.5 h-3.5" /> Only you can see this space.
          </p>
        )}
      </section>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}

      {share && (
        <div className="mt-6 pt-5 border-t border-ink-100 dark:border-ink-800">
          {isOwner && doc.protected ? (
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              This space is protected: it stays shared and can’t be deleted. You can still add or remove people.
            </p>
          ) : isOwner ? (
            <>
              <Button
                variant="danger"
                className="w-full"
                disabled={busy !== null}
                onClick={() => {
                  if (!confirmStop) {
                    setConfirmStop(true);
                    return;
                  }
                  void run('stop', onStopSharing).then((ok) => ok && onClose());
                }}
              >
                {busy === 'stop' && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmStop ? 'Click again to stop sharing' : 'Stop sharing'}
              </Button>
              <p className="mt-2 text-[12px] text-ink-400 dark:text-ink-500">
                Everyone else loses access. The space stays in your account.
              </p>
            </>
          ) : (
            <Button
              variant="danger"
              className="w-full"
              disabled={busy !== null}
              onClick={() => void run('leave', onLeave).then((ok) => ok && onClose())}
            >
              {busy === 'leave' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Leave space
            </Button>
          )}
        </div>
      )}
    </Dialog>
  );
};
