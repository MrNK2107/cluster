import React, { useState } from 'react';
import { LogOut, Download, Upload, Sun, Moon, Loader2, Eye, EyeOff } from 'lucide-react';
import type { AuthUser } from '../utils/supabase';
import { describeError, updatePassword } from '../utils/supabase';
import { Avatar } from './Avatar';
import { Button, Dialog } from './ui';
import { cn } from '../utils/cn';

interface AccountModalProps {
  isOpen: boolean;
  user: AuthUser;
  theme: 'dark' | 'light';
  onSetTheme: (theme: 'dark' | 'light') => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="pt-5 mt-5 border-t border-ink-100 dark:border-ink-800">
    <h3 className="mb-3 text-[13px] font-semibold text-ink-500 dark:text-ink-400">{title}</h3>
    {children}
  </section>
);

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  user,
  theme,
  onSetTheme,
  onExport,
  onImport,
  onSignOut,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await onSignOut();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Account">
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-ink-50 dark:bg-ink-950">
        <Avatar user={user} className="w-12 h-12 text-lg" />
        <div className="min-w-0">
          {user.name && <div className="truncate font-display text-[17px] font-bold text-ink-950 dark:text-white">{user.name}</div>}
          <div className={cn('truncate', user.name ? 'text-[13px] text-ink-500 dark:text-ink-400' : 'font-semibold text-ink-900 dark:text-white')}>
            {user.email}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
        Your spaces are private unless you share them, and they’re saved to this account automatically.
      </p>

      <Section title="Appearance">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
          {(
            [
              ['light', 'Light', Sun],
              ['dark', 'Dark', Moon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => onSetTheme(value)}
              className={cn(
                'flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold transition-colors',
                theme === value
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Backup">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onExport}>
            <Download className="w-4 h-4" /> Download
          </Button>
          <label className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold cursor-pointer bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-700 dark:hover:bg-ink-800 transition-colors focus-within:ring-2 focus-within:ring-brand-500">
            <Upload className="w-4 h-4" /> Restore
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-ink-400 dark:text-ink-500">Restoring replaces all your spaces with the ones in the file.</p>
      </Section>

      <div className="mt-6">
        <Button variant="danger" className="w-full" onClick={handleSignOut} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Sign out
        </Button>
      </div>
    </Dialog>
  );
};

/** Shown after the user follows a password-reset link. */
export const SetPasswordDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      setPassword('');
      onClose();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Choose a new password" description="You’re signed in. Set a new password to use next time.">
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <input
            autoFocus
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            aria-label="New password"
            className="w-full h-12 pl-4 pr-12 rounded-xl text-[15px] bg-white dark:bg-ink-950 text-ink-900 dark:text-white placeholder:text-ink-400 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1.5 w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-[13px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save password
        </Button>
      </form>
    </Dialog>
  );
};
