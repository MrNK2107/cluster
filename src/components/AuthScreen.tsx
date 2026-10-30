import React, { useState } from 'react';
import { Check, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { getSupabaseClient, describeError, isCloudConfigured } from '../utils/supabase';

type Status = { text: string; type: 'success' | 'error' } | null;

const inputClass =
  'w-full text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
    <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">C</div>
        <div>
          <h1 className="font-semibold text-slate-900 dark:text-slate-100">Clustr</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your private spaces, saved to your account</p>
        </div>
      </div>
      {children}
    </div>
  </div>
);

/** Full-page loading / error state shown while the account's workspace is fetched. */
export const WorkspaceLoading: React.FC<{ error?: string | null; onRetry?: () => void; onSignOut?: () => void }> = ({
  error,
  onRetry,
  onSignOut,
}) => (
  <Shell>
    {error ? (
      <div className="space-y-4">
        <div className="px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSignOut}
            className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Sign out
          </button>
          <button
            onClick={onRetry}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your spaces…
      </div>
    )}
  </Shell>
);

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!isCloudConfigured) {
    return (
      <Shell>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Accounts are not available on this deployment. Set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to enable sign-in.
        </p>
      </Shell>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setStatus({ text: 'Enter your email and password', type: 'error' });
      return;
    }
    setIsBusy(true);
    setStatus(null);
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Accounts are not available right now.');
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setPassword('');
        // With email confirmation on, there is no session until the link is clicked.
        if (!data.session) setStatus({ text: 'Check your inbox to confirm your email, then sign in.', type: 'success' });
        return;
      }
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (err) {
      setStatus({ text: describeError(err), type: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Shell>
      {status && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
          }`}
        >
          {status.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="name@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={isBusy}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          <span>{isSignUp ? 'Create account' : 'Sign in'}</span>
        </button>
      </form>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setStatus(null);
          }}
          className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </Shell>
  );
};
