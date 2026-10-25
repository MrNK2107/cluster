import React, { useState } from 'react';
import {
  CheckSquare,
  FileText,
  StickyNote,
  Hash,
  Layers,
  ArrowRight,
  Share2,
  Moon,
  Sun,
  Menu,
  Calculator,
  X,
  Cloud,
  LayoutGrid,
  Map,
  Search
} from 'lucide-react';
import type { BoardDocument, CardType } from '../types';

interface TopBarProps {
  document: BoardDocument;
  theme: 'dark' | 'light';
  viewMode: 'canvas' | 'feed';
  connectMode: boolean;
  activeTagFilter: string | null;
  allTags: string[];
  isCloudSynced: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleViewMode: () => void;
  onToggleConnectMode: () => void;
  onSelectTagFilter: (tag: string | null) => void;
  onAddCard: (type: CardType) => void;
  onAddCluster: () => void;
  onOpenShareModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenCommandPalette: () => void;
  onUpdateDocTitle: (title: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  document,
  theme,
  viewMode,
  connectMode,
  activeTagFilter,
  allTags,
  isCloudSynced,
  onToggleSidebar,
  onToggleTheme,
  onToggleViewMode,
  onToggleConnectMode,
  onSelectTagFilter,
  onAddCard,
  onAddCluster,
  onOpenShareModal,
  onOpenSupabaseModal,
  onOpenCommandPalette,
  onUpdateDocTitle,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between z-30 select-none glass-panel">
      {/* Left: Sidebar toggle + Document title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors shrink-0"
          title="Toggle Documents Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-xl shrink-0 p-1 rounded-xl bg-slate-100/70 dark:bg-white/5">{document.icon || '📝'}</span>
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
              className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg outline-none ring-2 ring-indigo-500"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base tracking-tight truncate cursor-pointer hover:bg-slate-100/70 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
              title="Click to rename"
            >
              {document.title}
            </h1>
          )}
        </div>
      </div>

      {/* Center: Quick Creation Toolbar (Desktop) */}
      <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/70 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-xs">
        <button
          onClick={() => onAddCard('todo')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-[0.98]"
        >
          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>+ Todo</span>
        </button>

        <button
          onClick={() => onAddCard('note')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-[0.98]"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <span>+ Note</span>
        </button>

        <button
          onClick={() => onAddCard('sticky')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:text-amber-600 dark:hover:text-amber-400 transition-all active:scale-[0.98]"
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          <span>+ Sticky</span>
        </button>

        <button
          onClick={() => onAddCard('counter')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:text-pink-600 dark:hover:text-pink-400 transition-all active:scale-[0.98]"
        >
          <Calculator className="w-3.5 h-3.5 text-pink-500" />
          <span>+ Tally</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-1" />

        <button
          onClick={onAddCluster}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Cluster</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Spotlight Search button (Cmd+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 transition-colors shadow-xs"
          title="Open Command Palette"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search</span>
          <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-400 border border-slate-200 dark:border-white/10">
            ⌘K
          </kbd>
        </button>

        {/* View Mode Toggle (Mobile Feed vs Spatial Canvas) */}
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
          title={`Switch to ${viewMode === 'feed' ? 'Spatial Canvas' : 'Mobile Feed'} view`}
        >
          {viewMode === 'feed' ? (
            <>
              <Map className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Canvas</span>
            </>
          ) : (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Feed</span>
            </>
          )}
        </button>

        {/* Supabase Cloud Sync Status Button */}
        <button
          onClick={onOpenSupabaseModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            isCloudSynced
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title={isCloudSynced ? 'Cloud sync: signed in' : 'Cloud sync'}
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Sync</span>
          <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        </button>

        {/* Tag Filter Dropdown */}
        {allTags.length > 0 && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeTagFilter
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300'
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
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onSelectTagFilter(null);
                    setShowTagMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 font-semibold"
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
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold ${
                      activeTagFilter === t ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connect Arrow Toggle (Canvas View) */}
        {viewMode === 'canvas' && (
          <button
            onClick={onToggleConnectMode}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              connectMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
            title="Connect cards with arrows"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Connect</span>
          </button>
        )}

        {/* Share / Export */}
        <button
          onClick={onOpenShareModal}
          className="p-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-white/10 transition-colors shadow-xs"
          title="Export / Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 transition-colors shadow-xs"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
        </button>
      </div>
    </header>
  );
};
