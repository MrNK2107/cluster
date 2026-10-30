import React, { useState } from 'react';
import {
  CheckSquare,
  FileText,
  StickyNote,
  Hash,
  Layers,
  Moon,
  Sun,
  Menu,
  Calculator,
  X,
  LayoutGrid,
  Map,
  Search,
  Cloud,
  CloudOff,
  Loader2
} from 'lucide-react';
import type { BoardDocument, CardType } from '../types';
import type { SaveState } from '../App';

interface TopBarProps {
  document: BoardDocument;
  theme: 'dark' | 'light';
  viewMode: 'canvas' | 'feed';
  saveState: SaveState;
  activeTagFilter: string | null;
  allTags: string[];
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleViewMode: () => void;
  onSelectTagFilter: (tag: string | null) => void;
  onAddCard: (type: CardType) => void;
  onAddCluster: () => void;
  onOpenCommandPalette: () => void;
  onUpdateDocTitle: (title: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  document,
  theme,
  viewMode,
  saveState,
  activeTagFilter,
  allTags,
  onToggleSidebar,
  onToggleTheme,
  onToggleViewMode,
  onSelectTagFilter,
  onAddCard,
  onAddCluster,
  onOpenCommandPalette,
  onUpdateDocTitle,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  return (
    <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 px-4 sm:px-6 flex items-center justify-between gap-4 z-30 select-none glass-panel">
      {/* Left: Sidebar toggle + Document title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors shrink-0"
          title="Toggle Documents Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{document.icon || '📝'}</span>
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              defaultValue={document.title}
              onBlur={(e) => {
                onUpdateDocTitle(e.target.value.trim() || 'Untitled Document');
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateDocTitle((e.target as HTMLInputElement).value.trim() || 'Untitled Document');
                  setIsEditingTitle(false);
                }
              }}
              className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg outline-none ring-2 ring-indigo-500"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base tracking-tight truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
              title="Click to rename"
            >
              {document.title}
            </h1>
          )}
          <span
            className={`shrink-0 flex items-center gap-1 text-[11px] font-medium ${
              saveState === 'error' ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
            }`}
            title={saveState === 'error' ? 'Could not save. Retrying…' : saveState === 'saving' ? 'Saving…' : 'All changes saved'}
            role="status"
          >
            {saveState === 'saving' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveState === 'error' ? (
              <CloudOff className="w-3.5 h-3.5" />
            ) : (
              <Cloud className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {saveState === 'error' ? 'Not saved' : saveState === 'saving' ? 'Saving' : 'Saved'}
            </span>
          </span>
        </div>
      </div>

      {/* Center: Quick Creation Toolbar (Desktop) */}
      <div className="hidden lg:flex shrink-0 items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onAddCard('todo')}
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors active:scale-[0.98]"
        >
          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>+ Todo</span>
        </button>

        <button
          onClick={() => onAddCard('note')}
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors active:scale-[0.98]"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <span>+ Note</span>
        </button>

        <button
          onClick={() => onAddCard('sticky')}
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:text-amber-600 dark:hover:text-amber-400 transition-colors active:scale-[0.98]"
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          <span>+ Sticky</span>
        </button>

        <button
          onClick={() => onAddCard('counter')}
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:text-pink-600 dark:hover:text-pink-400 transition-colors active:scale-[0.98]"
        >
          <Calculator className="w-3.5 h-3.5 text-pink-500" />
          <span>+ Tally</span>
        </button>

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

        <button
          onClick={onAddCluster}
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors active:scale-[0.98]"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Cluster</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Spotlight Search button (Cmd+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          title="Open Command Palette"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden 2xl:inline">Search</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* View Mode Toggle (Mobile Feed vs Spatial Canvas) */}
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${viewMode === 'feed' ? 'Spatial Canvas' : 'Mobile Feed'} view`}
        >
          {viewMode === 'feed' ? (
            <>
              <Map className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden 2xl:inline">Canvas</span>
            </>
          ) : (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden 2xl:inline">Feed</span>
            </>
          )}
        </button>

        {/* Tag Filter Dropdown */}
        {allTags.length > 0 && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                activeTagFilter
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Hash className="w-3 h-3" />
              <span>{activeTagFilter || 'Tags'}</span>
              {activeTagFilter && (
                <X
                  className="w-3 h-3 hover:text-rose-500 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTagFilter(null);
                  }}
                />
              )}
            </button>
            {showTagMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs">
                <button
                  onClick={() => {
                    onSelectTagFilter(null);
                    setShowTagMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium"
                >
                  Show All Cards
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onSelectTagFilter(t);
                      setShowTagMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium ${
                      activeTagFilter === t ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
        </button>
      </div>
    </header>
  );
};
