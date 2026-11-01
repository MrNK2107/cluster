import React, { useCallback, useState } from 'react';
import { Moon, Sun, PanelLeftOpen, LayoutGrid, Rows3, Search, Hash, X, Check, CloudOff, Loader2 } from 'lucide-react';
import type { BoardDocument } from '../types';
import type { SaveState } from '../App';
import { IconButton, MenuItem, MenuLabel, MenuPanel, useDismiss } from './ui';
import { stripLeadingEmoji } from './Sidebar';
import { cn } from '../utils/cn';

interface TopBarProps {
  document: BoardDocument;
  theme: 'dark' | 'light';
  viewMode: 'canvas' | 'feed';
  saveState: SaveState;
  sidebarOpen: boolean;
  activeTagFilter: string | null;
  allTags: string[];
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onSetViewMode: (mode: 'canvas' | 'feed') => void;
  onSelectTagFilter: (tag: string | null) => void;
  onOpenCommandPalette: () => void;
  onUpdateDocTitle: (title: string) => void;
}

const SaveIndicator: React.FC<{ state: SaveState }> = ({ state }) => (
  <span
    role="status"
    aria-live="polite"
    title={state === 'error' ? 'Couldn’t save. Retrying in a moment.' : undefined}
    className={cn(
      'hidden sm:inline-flex shrink-0 items-center gap-1.5 h-6 px-2 rounded-full text-[12px] font-semibold transition-colors',
      state === 'error' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'text-ink-400 dark:text-ink-500',
    )}
  >
    {state === 'saving' ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
    ) : state === 'error' ? (
      <CloudOff className="w-3.5 h-3.5" />
    ) : (
      <Check className="w-3.5 h-3.5 text-mint-500" />
    )}
    {state === 'error' ? 'Not saved' : state === 'saving' ? 'Saving' : 'Saved'}
  </span>
);

const ViewSwitch: React.FC<{ value: 'canvas' | 'feed'; onChange: (v: 'canvas' | 'feed') => void }> = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="View" className="flex items-center p-1 rounded-xl bg-ink-100 dark:bg-ink-800/80">
    {(
      [
        ['canvas', 'Canvas', LayoutGrid],
        ['feed', 'List', Rows3],
      ] as const
    ).map(([mode, label, Icon]) => (
      <button
        key={mode}
        type="button"
        role="radio"
        aria-checked={value === mode}
        onClick={() => onChange(mode)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-[13px] font-semibold transition-all',
          value === mode
            ? 'bg-white text-ink-950 shadow-[0_1px_3px_rgba(20,20,60,0.12)] dark:bg-ink-950 dark:text-white'
            : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    ))}
  </div>
);

export const TopBar: React.FC<TopBarProps> = ({
  document,
  theme,
  viewMode,
  saveState,
  sidebarOpen,
  activeTagFilter,
  allTags,
  onToggleSidebar,
  onToggleTheme,
  onSetViewMode,
  onSelectTagFilter,
  onOpenCommandPalette,
  onUpdateDocTitle,
}) => {
  const [editing, setEditing] = useState(false);
  const [tagMenu, setTagMenu] = useState(false);
  const closeTags = useCallback(() => setTagMenu(false), []);
  const tagRef = useDismiss(tagMenu, closeTags);
  const title = stripLeadingEmoji(document.title, document.icon);

  const commitTitle = (value: string) => {
    const next = value.trim() || 'Untitled space';
    onUpdateDocTitle(document.icon && document.title.startsWith(document.icon) ? `${document.icon} ${next}` : next);
    setEditing(false);
  };

  return (
    <header className="relative z-30 h-16 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 bg-white/80 dark:bg-ink-950/80 border-b border-ink-200/70 dark:border-white/[0.06] glass-panel select-none">
      {/* Left */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
        <IconButton
          label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          onClick={onToggleSidebar}
          className={cn(sidebarOpen && 'md:hidden')}
        >
          <PanelLeftOpen className="w-[18px] h-[18px]" />
        </IconButton>

        <span className="hidden sm:flex w-9 h-9 shrink-0 items-center justify-center rounded-[10px] bg-ink-100 dark:bg-ink-800 text-lg">
          {document.icon || '📝'}
        </span>

        {editing ? (
          <input
            autoFocus
            defaultValue={title}
            aria-label="Space name"
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
            className="min-w-0 flex-1 max-w-md h-9 px-2 -ml-0.5 rounded-lg font-display text-lg font-bold tracking-tight bg-ink-100 dark:bg-ink-800 text-ink-950 dark:text-white outline-none ring-2 ring-brand-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename space"
            className="min-w-0 truncate h-9 px-2 -ml-0.5 rounded-lg font-display text-lg font-bold tracking-tight text-ink-950 dark:text-white hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          >
            {title}
          </button>
        )}

        <SaveIndicator state={saveState} />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {allTags.length > 0 && (
          <div ref={tagRef} className="relative">
            {activeTagFilter ? (
              <span className="inline-flex items-center h-9 pl-3 pr-1 gap-1 rounded-xl bg-sun-300 text-ink-950 text-[13px] font-semibold">
                <button type="button" onClick={() => setTagMenu((o) => !o)} className="max-w-28 truncate">
                  {activeTagFilter}
                </button>
                <button
                  type="button"
                  aria-label="Clear tag filter"
                  onClick={() => onSelectTagFilter(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <IconButton label="Filter by tag" onClick={() => setTagMenu((o) => !o)}>
                <Hash className="w-[18px] h-[18px]" />
              </IconButton>
            )}
            {tagMenu && (
              <MenuPanel className="right-0 top-full mt-2 w-56 max-h-80 overflow-y-auto">
                <MenuLabel>Show only cards tagged</MenuLabel>
                {allTags.map((t) => (
                  <MenuItem
                    key={t}
                    active={activeTagFilter === t}
                    onClick={() => {
                      onSelectTagFilter(activeTagFilter === t ? null : t);
                      setTagMenu(false);
                    }}
                    hint={activeTagFilter === t ? <Check className="w-4 h-4" /> : undefined}
                  >
                    {t}
                  </MenuItem>
                ))}
              </MenuPanel>
            )}
          </div>
        )}

        <ViewSwitch value={viewMode} onChange={onSetViewMode} />

        <IconButton label="Search" onClick={onOpenCommandPalette} className={cn(sidebarOpen && 'md:hidden')}>
          <Search className="w-[18px] h-[18px]" />
        </IconButton>

        <IconButton label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={onToggleTheme} className="max-sm:hidden">
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </IconButton>
      </div>
    </header>
  );
};
