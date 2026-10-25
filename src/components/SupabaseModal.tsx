import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Cloud,
  Check,
  Copy,
  LogIn,
  UserPlus,
  LogOut,
  ExternalLink,
  AlertCircle,
  DownloadCloud,
  UploadCloud,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Unplug,
} from 'lucide-react';
import {
  getConnectionInfo,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  getSupabaseClient,
  getCurrentUserEmail,
  describeError,
  hasEnvCredentials,
  SUPABASE_SQL_SETUP,
  type ConnectionInfo,
} from '../utils/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncPush: () => Promise<void>;
  onSyncPull: () => Promise<void>;
  onAuthChange?: () => void;
}

type Status = { text: string; type: 'success' | 'error' } | null;

const inputClass =
  'w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500';

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncPush,
  onSyncPull,
  onAuthChange,
}) => {
  const [info, setInfo] = useState<ConnectionInfo>(() => getConnectionInfo());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Connection editor state. The key field is always empty on open: the
  // stored key is never read back into the page.
  const [showConnection, setShowConnection] = useState(false);
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const refresh = useCallback(async () => {
    const next = getConnectionInfo();
    setInfo(next);
    setUserEmail(next.configured ? await getCurrentUserEmail() : null);
    onAuthChange?.();
  }, [onAuthChange]);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    setPassword('');
    setKeyInput('');
    setEditing(false);
    setShowSql(false);
    const current = getConnectionInfo();
    setShowConnection(!current.configured);
    setUrlInput(current.source === 'custom' ? current.url : '');
    void refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const run = async (task: () => Promise<string>) => {
    setIsBusy(true);
    setStatus(null);
    try {
      const text = await task();
      setStatus({ text, type: 'success' });
    } catch (err) {
      setStatus({ text: describeError(err), type: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const result = saveSupabaseCredentials(urlInput, keyInput);
    if (!result.ok) {
      setStatus({ text: result.error ?? 'Could not save', type: 'error' });
      return;
    }
    setKeyInput('');
    setEditing(false);
    setStatus({ text: 'Connected. Sign in to start syncing.', type: 'success' });
    void refresh();
  };

  const handleDisconnect = () =>
    run(async () => {
      await clearSupabaseCredentials();
      await refresh();
      setShowConnection(!getConnectionInfo().configured);
      return 'Disconnected. Your data stays on this device.';
    });

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setStatus({ text: 'Enter your email and password', type: 'error' });
      return;
    }
    void run(async () => {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Cloud sync is not set up yet.');
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setPassword('');
        await refresh();
        return data.session ? 'Account created and signed in.' : 'Check your inbox to confirm your email.';
      }
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
      await refresh();
      return 'Signed in.';
    });
  };

  const handleSignOut = () =>
    run(async () => {
      const client = await getSupabaseClient();
      await client?.auth.signOut();
      await refresh();
      return 'Signed out.';
    });

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      setStatus({ text: 'Clipboard is blocked. Select the SQL and copy it manually.', type: 'error' });
      setShowSql(true);
    }
  };

  const sourceLabel =
    info.source === 'env' ? 'Configured by this deployment' : info.source === 'custom' ? 'Your own project' : 'Not connected';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-sync-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 id="cloud-sync-title" className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Cloud sync
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Keep your spaces in sync across devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {status && (
            <div
              role="status"
              className={`p-3 rounded-xl flex items-center gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
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

          {/* Account */}
          {info.configured && userEmail && (
            <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  {userEmail[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Signed in</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{userEmail}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => run(async () => { await onSyncPush(); return 'Workspace pushed to the cloud.'; })}
                  disabled={isBusy}
                  className="py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Push
                </button>
                <button
                  onClick={() => run(async () => { await onSyncPull(); return 'Latest workspace pulled from the cloud.'; })}
                  disabled={isBusy}
                  className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <DownloadCloud className="w-3.5 h-3.5" /> Pull
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Push replaces the cloud copy with this device. Pull replaces this device with the cloud copy.
              </p>
              <button
                onClick={handleSignOut}
                disabled={isBusy}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </section>
          )}

          {info.configured && !userEmail && (
            <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {isSignUp ? 'Create an account' : 'Sign in'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-[11px]"
                >
                  {isSignUp ? 'Have an account? Sign in' : 'New here? Sign up'}
                </button>
              </div>
              <form onSubmit={handleAuth} className="space-y-2">
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
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  {isSignUp ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                  <span>{isSignUp ? 'Sign up' : 'Sign in'}</span>
                </button>
              </form>
            </section>
          )}

          {!info.configured && (
            <section className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Your data lives on this device
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Nothing leaves your browser until you connect a cloud project below. Use the Backup button in the sidebar for an offline copy.
              </p>
            </section>
          )}

          {/* Connection (collapsed when already configured) */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConnection((v) => !v)}
              className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              aria-expanded={showConnection}
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-700 dark:text-slate-200">Connection</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {sourceLabel}
                  {info.configured && info.host ? ` · ${info.host}` : ''}
                  {info.configured && info.keyHint ? ` · key ${info.keyHint}` : ''}
                </div>
              </div>
              {showConnection ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {showConnection && (
              <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                {info.configured && !editing && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(true); setUrlInput(info.source === 'custom' ? info.url : ''); }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {info.source === 'env' ? 'Use my own project' : 'Change project'}
                    </button>
                    {info.source === 'custom' && (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold flex items-center gap-1"
                      >
                        <Unplug className="w-3 h-3" /> Disconnect
                      </button>
                    )}
                  </div>
                )}

                {(editing || !info.configured) && (
                  <form onSubmit={handleSaveConnection} className="space-y-2.5">
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      Paste the <strong>Project URL</strong> and the <strong>anon / publishable</strong> key from your Supabase project settings.
                      Never paste the service role or secret key.
                    </p>
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="https://abcd.supabase.co"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className={`${inputClass} font-mono text-[11px]`}
                    />
                    <input
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Anon / publishable key"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className={`${inputClass} font-mono text-[11px]`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      >
                        Connect
                      </button>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => { setEditing(false); setKeyInput(''); }}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      Open the Supabase dashboard <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </form>
                )}

                {/* One-time database setup, only relevant when wiring your own project */}
                {(editing || !info.configured || info.source === 'custom') && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                        First time? Create the table in the SQL editor
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowSql((v) => !v)}
                          className="text-[11px] text-slate-500 hover:underline"
                        >
                          {showSql ? 'Hide SQL' : 'Show SQL'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                          {copiedSql ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                        </button>
                      </div>
                    </div>
                    {showSql && (
                      <pre className="p-2 bg-slate-900 text-slate-200 text-[10px] font-mono rounded-lg overflow-x-auto leading-relaxed select-text">
                        {SUPABASE_SQL_SETUP}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {hasEnvCredentials && info.source === 'env' && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              This deployment ships with a cloud project. Only your own account can read the data you push.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
