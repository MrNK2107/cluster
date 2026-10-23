import React, { useState } from 'react';
import { 
  CheckSquare, 
  FileText, 
  StickyNote, 
  Hash, 
  Layers, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  Share2, 
  Moon, 
  Sun, 
  Menu, 
  Calculator, 
  X,
  Database,
  LayoutGrid,
  Map
} from 'lucide-react';
import type { BoardDocument, CardType } from '../types';

interface TopBarProps {
  document: BoardDocument;
  theme: 'dark' | 'light';
  viewMode: 'canvas' | 'feed';
  connectMode: boolean;
  activeTagFilter: string | null;
  allTags: string[];
  zoom: number;
  isCloudSynced: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleViewMode: () => void;
  onToggleConnectMode: () => void;
  onSelectTagFilter: (tag: string | null) => void;
  onAddCard: (type: CardType) => void;
  onAddCluster: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenShareModal: () => void;
  onOpenSupabaseModal: () => void;
  onUpdateDocTitle: (title: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  document,
  theme,
  viewMode,
  connectMode,
  activeTagFilter,
  allTags,
  zoom,
  isCloudSynced,
  onToggleSidebar,
  onToggleTheme,
  onToggleViewMode,
  onToggleConnectMode,
  onSelectTagFilter,
  onAddCard,
  onAddCluster,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenShareModal,
  onOpenSupabaseModal,
  onUpdateDocTitle,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Sidebar toggle + Document title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
          title="Toggle Documents Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="text-lg sm:text-xl shrink-0">{document.icon || '📝'}</span>
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
              className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded outline-none"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 px-1.5 py-0.5 rounded"
              title="Click to rename"
            >
              {document.title}
            </h1>
          )}
        </div>
      </div>

      {/* Center: Quick Creation Toolbar (visible on desktop) */}
      <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onAddCard('todo')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>+ Todo</span>
        </button>

        <button
          onClick={() => onAddCard('note')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <span>+ Note</span>
        </button>

        <button
          onClick={() => onAddCard('sticky')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors"
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          <span>+ Sticky</span>
        </button>

        <button
          onClick={() => onAddCard('counter')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-pink-50 dark:hover:bg-pink-950/40 hover:text-pink-600 transition-colors"
        >
          <Calculator className="w-3.5 h-3.5 text-pink-500" />
          <span>+ Tally</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <button
          onClick={onAddCluster}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Cluster</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* View Mode Toggle (Mobile Feed vs Spatial Canvas) */}
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
              <span className="hidden sm:inline">Feed View</span>
            </>
          )}
        </button>

        {/* Supabase Cloud Sync Status Button */}
        <button
          onClick={onOpenSupabaseModal}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
            isCloudSynced
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
          title="Supabase Cloud Sync Settings"
        >
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Supabase</span>
          <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        </button>

        {/* Tag Filter Dropdown */}
        {allTags.length > 0 && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                activeTagFilter
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Hash className="w-3 h-3" />
              <span>{activeTagFilter || 'Filter'}</span>
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
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    onSelectTagFilter(null);
                    setShowTagMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 font-medium"
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
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium ${
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

        {/* Connect Arrow Toggle (only on canvas view) */}
        {viewMode === 'canvas' && (
          <button
            onClick={onToggleConnectMode}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              connectMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Connect cards with arrows"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Connect</span>
          </button>
        )}

        {/* Zoom Controls (only on canvas view) */}
        {viewMode === 'canvas' && (
          <div className="hidden xl:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            <button
              onClick={onZoomOut}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetZoom}
              className="px-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
              title="Reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Share / Export */}
        <button
          onClick={onOpenShareModal}
          className="p-1.5 sm:px-2.5 sm:py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          title="Export / Share"
        >
          <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
