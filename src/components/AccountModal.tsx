import React, { useState, useEffect } from 'react';
import { X, LogOut, UserRound, Lock } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  userEmail: string | null;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, userEmail, onSignOut, onClose }) => {
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !userEmail) return null;

  const handleSignOut = async () => {
    setIsBusy(true);
    try {
      await onSignOut();
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserRound className="w-4 h-4" />
            </div>
            <div>
              <h3 id="account-title" className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your spaces are saved to your account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-sm">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 min-w-0">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold shrink-0">
              {userEmail[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">Signed in as</div>
              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{userEmail}</div>
            </div>
          </div>
          <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Your spaces are private. Only you can see them when signed in.
          </p>
          <button
            onClick={handleSignOut}
            disabled={isBusy}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
