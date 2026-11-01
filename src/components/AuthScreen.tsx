import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import {
  describeError,
  isCloudConfigured,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  readAuthRedirectError,
} from '../utils/supabase';
import { Button, LogoMark, Wordmark } from './ui';
import { cn } from '../utils/cn';

type Mode = 'signin' | 'signup' | 'reset';
type Status = { text: string; type: 'success' | 'error' } | null;

/* --------------------------------------------------------------------------
 * Pieces
 * ----------------------------------------------------------------------- */

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-[18px] h-[18px]' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const Notice: React.FC<{ status: NonNullable<Status> }> = ({ status }) => (
  <div
    role={status.type === 'error' ? 'alert' : 'status'}
    className={cn(
      'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-snug animate-pop-in',
      status.type === 'success'
        ? 'bg-mint-500/12 text-emerald-800 dark:text-emerald-300'
        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    )}
  >
    {status.type === 'success' ? (
      <CheckCircle2 className="w-4 h-4 mt-px shrink-0 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <AlertCircle className="w-4 h-4 mt-px shrink-0 text-rose-500" />
    )}
    <span>{status.text}</span>
  </div>
);

const Field: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; trailing?: React.ReactNode }
> = ({ label, trailing, id, className, ...props }) => (
  <label htmlFor={id} className="block">
    <span className="block mb-1.5 text-[13px] font-semibold text-ink-700 dark:text-ink-200">{label}</span>
    <span className="relative block">
      <input
        id={id}
        className={cn(
          'w-full h-12 px-4 rounded-xl text-[15px] bg-white dark:bg-ink-900 text-ink-900 dark:text-white placeholder:text-ink-400 dark:placeholder:text-ink-500 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 outline-none transition-shadow focus:ring-2 focus:ring-brand-500',
          trailing ? 'pr-12' : '',
          className,
        )}
        {...props}
      />
      {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
    </span>
  </label>
);

/** The right-hand illustration: a tiny canvas of clusters. Decorative only. */
const CanvasIllustration: React.FC = () => (
  <div aria-hidden="true" className="relative w-full max-w-[460px] aspect-[5/4] select-none">
    {/* Cluster: This week */}
    <div className="absolute left-[2%] top-[4%] w-[54%] rounded-[22px] border-2 border-white/25 bg-white/[0.07] p-3 pt-0">
      <span className="inline-block -translate-y-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-brand-700">
        This week
      </span>
      <div className="rounded-2xl bg-white p-3.5 shadow-[0_18px_30px_-18px_rgba(0,0,30,0.6)]">
        <div className="text-[12px] font-bold text-ink-900">Move-in checklist</div>
        <div className="mt-2 h-1.5 rounded-full bg-ink-100">
          <div className="h-full w-2/3 rounded-full bg-mint-500" />
        </div>
        {[
          ['Book the van', true],
          ['Transfer deposit', true],
          ['Buy curtains', false],
        ].map(([t, done]) => (
          <div key={t as string} className="mt-2 flex items-center gap-2 text-[11.5px]">
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full',
                done ? 'bg-mint-500' : 'ring-[1.5px] ring-ink-300',
              )}
            >
              {done && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white">
                  <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className={done ? 'text-ink-400 line-through' : 'text-ink-800'}>{t}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Sticky */}
    <div className="absolute right-[3%] top-[2%] w-[36%] rotate-[4deg] rounded-2xl bg-sun-300 p-3.5 shadow-[0_22px_34px_-20px_rgba(0,0,30,0.7)]">
      <div className="font-display text-[15px] font-bold leading-tight text-ink-950">Call mum back about Sunday 📞</div>
    </div>

    {/* Cluster: Ideas */}
    <div className="absolute right-[2%] bottom-[3%] w-[52%] rounded-[22px] border-2 border-white/25 bg-white/[0.07] p-3 pt-0">
      <span className="inline-block -translate-y-1/2 rounded-full bg-sun-300 px-3 py-1 text-[11px] font-bold text-ink-950">
        Ideas
      </span>
      <div className="rounded-2xl bg-white p-3.5 shadow-[0_18px_30px_-18px_rgba(0,0,30,0.6)]">
        <div className="text-[12px] font-bold text-ink-900">Side project</div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
          A tiny app that turns receipts into a monthly spend map.
        </p>
      </div>
    </div>

    {/* Tally */}
    <div className="absolute left-[8%] bottom-[6%] w-[30%] -rotate-[3deg] rounded-2xl bg-white p-3 text-center shadow-[0_18px_30px_-18px_rgba(0,0,30,0.6)]">
      <div className="text-[10px] font-semibold text-ink-400">Glasses of water</div>
      <div className="font-display text-3xl font-extrabold text-brand-600 tabular-nums">6</div>
    </div>
  </div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-dvh w-full overflow-y-auto bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-ink-100 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <main className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
      <div className="flex items-center gap-2.5">
        <LogoMark className="w-8 h-8" />
        <Wordmark className="text-2xl text-ink-950 dark:text-white" />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
      <p className="text-xs text-ink-400 dark:text-ink-500">Your spaces are private to your account.</p>
    </main>

    <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-600 px-12 py-12 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sun-400/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-mint-400/25 blur-3xl" />

      <h2 className="relative max-w-md font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-balance">
        Every loose thought, somewhere you can find it.
      </h2>
      <div className="relative flex flex-1 items-center justify-center py-10">
        <CanvasIllustration />
      </div>
      <p className="relative max-w-sm text-[15px] leading-relaxed text-brand-100">
        Group to-dos, notes and stickies into clusters on an open canvas, or flip to a simple list on your phone.
      </p>
    </aside>
  </div>
);

/* --------------------------------------------------------------------------
 * Loading / error while the workspace is fetched
 * ----------------------------------------------------------------------- */

export const WorkspaceLoading: React.FC<{ error?: string | null; onRetry?: () => void; onSignOut?: () => void }> = ({
  error,
  onRetry,
  onSignOut,
}) => (
  <div className="min-h-dvh w-full flex items-center justify-center p-6 bg-ink-50 dark:bg-ink-950">
    {error ? (
      <div className="w-full max-w-sm space-y-5 text-center animate-pop-in">
        <LogoMark className="w-12 h-12 mx-auto" />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-950 dark:text-white">Your spaces didn’t load</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{error}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-4" role="status" aria-label="Loading your spaces">
        <LogoMark className="w-12 h-12 animate-pulse" />
        <span className="text-sm font-medium text-ink-500 dark:text-ink-400">Loading your spaces…</span>
      </div>
    )}
  </div>
);

/* --------------------------------------------------------------------------
 * Sign in / sign up / reset
 * ----------------------------------------------------------------------- */

const COPY: Record<Mode, { title: string; sub: string; submit: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to pick up where you left off.', submit: 'Sign in' },
  signup: { title: 'Create your account', sub: 'Free, private, and synced across your devices.', submit: 'Create account' },
  reset: { title: 'Reset your password', sub: 'We’ll email you a link to choose a new one.', submit: 'Send reset link' },
};

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>(() => {
    const redirectError = readAuthRedirectError();
    return redirectError ? { text: redirectError, type: 'error' } : null;
  });
  const [busy, setBusy] = useState<'google' | 'form' | null>(null);

  if (!isCloudConfigured) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white">Sign-in is off</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          This deployment has no account service configured. Set <code className="font-semibold">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-semibold">VITE_SUPABASE_ANON_KEY</code>, then redeploy.
        </p>
      </Shell>
    );
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setStatus(null);
    setPassword('');
  };

  const handleGoogle = async () => {
    setBusy('google');
    setStatus(null);
    const error = await signInWithGoogle();
    // On success the browser leaves for Google, so only failures land here.
    if (error) {
      setStatus({ text: error, type: 'error' });
      setBusy(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ text: 'Enter your email address.', type: 'error' });
      return;
    }
    if (mode !== 'reset' && !password) {
      setStatus({ text: 'Enter your password.', type: 'error' });
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setStatus({ text: 'Use at least 8 characters for your password.', type: 'error' });
      return;
    }

    setBusy('form');
    setStatus(null);
    try {
      if (mode === 'signin') {
        await signInWithPassword(trimmed, password);
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUpWithPassword(trimmed, password);
        setPassword('');
        if (needsConfirmation) {
          setStatus({ text: `We sent a confirmation link to ${trimmed}. Open it, then sign in here. Not there after a minute? Check your spam folder.`, type: 'success' });
          setMode('signin');
        }
      } else {
        await sendPasswordReset(trimmed);
        setStatus({ text: `If ${trimmed} has an account, a reset link is on its way.`, type: 'success' });
      }
    } catch (err) {
      setStatus({ text: describeError(err), type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const copy = COPY[mode];

  return (
    <Shell>
      {mode === 'reset' && (
        <button
          type="button"
          onClick={() => switchMode('signin')}
          className="mb-6 -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>
      )}

      <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-ink-950 dark:text-white">{copy.title}</h1>
      <p className="mt-2 text-[15px] text-ink-500 dark:text-ink-400">{copy.sub}</p>

      <div className="mt-8 space-y-5">
        {status && <Notice status={status} />}

        {mode !== 'reset' && (
          <>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={handleGoogle}
              disabled={busy !== null}
            >
              {busy === 'google' ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-xs font-medium text-ink-400 dark:text-ink-500">
              <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
              or use email
              <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field
            id="auth-email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode !== 'reset' && (
            <div>
              <Field
                id="auth-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {mode === 'signin' && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-[13px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy !== null}>
            {busy === 'form' && <Loader2 className="w-4 h-4 animate-spin" />}
            {copy.submit}
          </Button>
        </form>

        {mode !== 'reset' && (
          <p className="text-center text-sm text-ink-500 dark:text-ink-400">
            {mode === 'signup' ? 'Already have an account?' : 'New to clustr?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        )}
      </div>
    </Shell>
  );
};
