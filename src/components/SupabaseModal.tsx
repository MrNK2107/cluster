import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  Key, 
  LogIn, 
  UserPlus, 
  LogOut, 
  ExternalLink,
  AlertCircle,
  DownloadCloud,
  UploadCloud
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  getSupabaseClient, 
  SUPABASE_SQL_SETUP 
} from '../utils/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncPush: () => Promise<void>;
  onSyncPull: () => Promise<void>;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onSyncPush,
  onSyncPull,
}) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
      checkUser();
    }
  }, [isOpen]);

  const checkUser = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: { user } } = await client.auth.getUser();
        setCurrentUserEmail(user?.email || null);
      } catch (e) {
        setCurrentUserEmail(null);
      }
    } else {
      setCurrentUserEmail(null);
    }
  };

  if (!isOpen) return null;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setStatusMsg({ text: 'Please enter both Supabase URL and Anon Key', type: 'error' });
      return;
    }
    saveSupabaseCredentials(url.trim(), key.trim());
    setStatusMsg({ text: 'Supabase credentials saved successfully!', type: 'success' });
    checkUser();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabaseClient();
    if (!client) {
      setStatusMsg({ text: 'Please configure and save Supabase credentials first', type: 'error' });
      return;
    }
    if (!email.trim() || !password.trim()) {
      setStatusMsg({ text: 'Please enter email and password', type: 'error' });
      return;
    }

    setIsBusy(true);
    setStatusMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        setStatusMsg({ 
          text: data.session ? 'Account created and signed in!' : 'Check your email for confirmation link!', 
          type: 'success' 
        });
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatusMsg({ text: 'Signed in successfully!', type: 'success' });
      }
      await checkUser();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Authentication failed', type: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
      setCurrentUserEmail(null);
      setStatusMsg({ text: 'Signed out', type: 'success' });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Supabase Free Cloud Storage & Sync
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                100% Free real-time sync across mobile & desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Status Alert */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span className="text-xs">{statusMsg.text}</span>
            </div>
          )}

          {/* User Status / Auth Card */}
          {currentUserEmail ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  {currentUserEmail[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Signed In As</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{currentUserEmail}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onSyncPush();
                      setStatusMsg({ text: 'Pushed workspace to Supabase!', type: 'success' });
                    } catch (e: any) {
                      setStatusMsg({ text: e.message, type: 'error' });
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  disabled={isBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1 shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Push</span>
                </button>
                <button
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onSyncPull();
                      setStatusMsg({ text: 'Pulled latest workspace from Supabase!', type: 'success' });
                    } catch (e: any) {
                      setStatusMsg({ text: e.message, type: 'error' });
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  disabled={isBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1 shadow-xs"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Pull</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 text-slate-500"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Sign In / Sign Up Form */
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {isSignUp ? 'Create Supabase Account' : 'Sign In with Supabase'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-[11px]"
                >
                  {isSignUp ? 'Have an account? Sign In' : 'New user? Sign Up'}
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-2">
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isSignUp ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                  <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Project Credentials (URL & Key) */}
          <form onSubmit={handleSaveCredentials} className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]">
                <Key className="w-3 h-3 text-slate-400" />
                Supabase Project Credentials
              </label>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>Free Supabase Dashboard</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div>
              <input
                type="text"
                placeholder="Project URL (e.g. https://xyz.supabase.co)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 font-mono text-[11px]"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Anon Public API Key (eyJ...)"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 font-mono text-[11px]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs"
            >
              Update Credentials
            </button>
          </form>

          {/* 1-Step SQL Setup */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                SQL Setup (Run once in Supabase SQL Editor)
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-2 bg-slate-900 text-slate-200 text-[10px] font-mono rounded-lg overflow-x-auto leading-relaxed">
              {SUPABASE_SQL_SETUP}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
