import React, { useCallback, useState } from 'react';
import { Plus, Search, MoreHorizontal, Copy, Trash2, PanelLeftClose, Users, LogOut } from 'lucide-react';
import type { BoardDocument } from '../types';
import type { AuthUser } from '../utils/supabase';
import { IconButton, Kbd, LogoMark, MOD_KEY, MenuItem, MenuPanel, Wordmark, useDismiss } from './ui';
import { Avatar } from './Avatar';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  documents: BoardDocument[];
  activeDocId: string;
  user: AuthUser;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onShareDocument: (id: string) => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onOpenCommandPalette: () => void;
  onOpenAccount: () => void;
  onClose: () => void;
}

const docProgress = (doc: BoardDocument) => {
  let total = 0;
  let done = 0;
  for (const c of doc.cards) {
    total += c.todos?.length ?? 0;
    done += c.todos?.filter((t) => t.completed).length ?? 0;
  }
  return { total, done };
};

/** Space titles in the seed data start with their emoji; don't show it twice. */
export const stripLeadingEmoji = (title: string, icon?: string) =>
  icon && title.startsWith(icon) ? title.slice(icon.length).trim() : title;

const SpaceRow: React.FC<{
  doc: BoardDocument;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ doc, active, canDelete, onSelect, onShare, onDuplicate, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const close = useCallback(() => {
    setMenuOpen(false);
    setConfirming(false);
  }, []);
  const menuRef = useDismiss(menuOpen, close);
  const { total, done } = docProgress(doc);
  const leaving = Boolean(doc.share && !doc.share.isOwner);
  const deleteLabel = leaving ? 'Leave space' : doc.share ? 'Delete for everyone' : 'Delete space';
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <li className="relative group">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl pl-2 pr-10 py-2 text-left transition-colors',
          active ? 'bg-white/[0.12] text-white' : 'text-ink-300 hover:bg-white/[0.06] hover:text-white',
        )}
      >
        <span
          className={cn(
            'w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center text-lg transition-colors',
            active ? 'bg-white shadow-sm' : 'bg-white/[0.08]',
          )}
        >
          {doc.icon || '📝'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-[14px] font-semibold">{stripLeadingEmoji(doc.title, doc.icon)}</span>
            {doc.share && (
              <Users
                className="w-3.5 h-3.5 shrink-0 text-ink-400"
                aria-label={doc.share.isOwner ? 'Shared' : `Shared by ${doc.share.ownerEmail}`}
              />
            )}
          </span>
          {total > 0 ? (
            <span className="mt-1.5 flex items-center gap-2">
              <span className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                <span
                  className={cn('block h-full rounded-full transition-[width] duration-500', pct === 100 ? 'bg-mint-400' : 'bg-sun-400')}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-[11px] font-medium tabular-nums text-ink-400">
                {done}/{total}
              </span>
            </span>
          ) : (
            <span className="block mt-0.5 text-[12px] text-ink-400">
              {doc.cards.length} {doc.cards.length === 1 ? 'card' : 'cards'}
            </span>
          )}
        </span>
      </button>

      <div ref={menuRef} className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <IconButton
          label={`Options for ${doc.title}`}
          size="sm"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            'text-ink-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100',
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
        </IconButton>
        {menuOpen && (
          <MenuPanel className="right-0 top-full mt-1 w-52">
            <MenuItem
              icon={<Users className="w-4 h-4" />}
              onClick={() => {
                onShare();
                close();
              }}
            >
              {doc.share && !doc.share.isOwner ? 'People' : 'Share…'}
            </MenuItem>
            <MenuItem
              icon={<Copy className="w-4 h-4" />}
              onClick={() => {
                onDuplicate();
                close();
              }}
            >
              Duplicate space
            </MenuItem>
            {canDelete && (
              <MenuItem
                tone="danger"
                icon={leaving ? <LogOut className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                onClick={() => {
                  if (!confirming) {
                    setConfirming(true);
                    return;
                  }
                  onDelete();
                  close();
                }}
              >
                {confirming ? (leaving ? 'Click again to leave' : 'Click again to delete') : deleteLabel}
              </MenuItem>
            )}
          </MenuPanel>
        )}
      </div>
    </li>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  documents,
  activeDocId,
  user,
  onSelectDocument,
  onCreateDocument,
  onShareDocument,
  onDuplicateDocument,
  onDeleteDocument,
  onOpenCommandPalette,
  onOpenAccount,
  onClose,
}) => {
  const isMobile = () => window.innerWidth < 768;

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-[2px] animate-fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Spaces"
        className={cn(
          'fixed md:relative inset-y-0 left-0 z-50 w-[280px] shrink-0 flex flex-col bg-ink-950 text-white select-none',
          'dark:bg-ink-900/70 dark:border-r dark:border-white/[0.06]',
          'transition-transform duration-300 ease-[var(--ease-out-quint)]',
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5 pl-1">
            <LogoMark className="w-7 h-7" />
            <Wordmark className="text-[22px] text-white" />
          </div>
          <IconButton label="Hide sidebar" onClick={onClose} className="text-ink-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10">
            <PanelLeftClose className="w-[18px] h-[18px]" />
          </IconButton>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full h-10 flex items-center gap-2.5 px-3 rounded-xl bg-white/[0.07] text-ink-400 hover:bg-white/[0.11] hover:text-ink-200 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left text-[13px] font-medium">Search or jump to…</span>
            <Kbd className="bg-white/10 text-ink-300 ring-white/10 dark:bg-white/10 dark:ring-white/10">{MOD_KEY} K</Kbd>
          </button>
        </div>

        {/* Spaces */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[12px] font-semibold text-ink-400">Spaces</h2>
          <IconButton
            label="New space"
            size="sm"
            onClick={onCreateDocument}
            className="text-ink-400 hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
          >
            <Plus className="w-4 h-4" />
          </IconButton>
        </div>

        <ul className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {documents.map((doc) => (
            <SpaceRow
              key={doc.id}
              doc={doc}
              active={doc.id === activeDocId}
              canDelete={Boolean(doc.share) || documents.length > 1}
              onSelect={() => {
                onSelectDocument(doc.id);
                if (isMobile()) onClose();
              }}
              onShare={() => onShareDocument(doc.id)}
              onDuplicate={() => onDuplicateDocument(doc.id)}
              onDelete={() => onDeleteDocument(doc.id)}
            />
          ))}
          <li>
            <button
              type="button"
              onClick={onCreateDocument}
              className="mt-1 w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left text-ink-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <span className="w-9 h-9 shrink-0 rounded-[10px] border border-dashed border-white/20 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </span>
              <span className="text-[14px] font-semibold">New space</span>
            </button>
          </li>
        </ul>

        {/* Account */}
        <div className="p-3 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={onOpenAccount}
            className="w-full flex items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.07] transition-colors"
          >
            <Avatar user={user} className="w-9 h-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-white">{user.name || user.email || 'Account'}</span>
              <span className="block truncate text-[12px] text-ink-400">{user.name ? user.email : 'Settings & backup'}</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
