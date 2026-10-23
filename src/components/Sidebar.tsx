import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Search, 
  FolderPlus,
  Command,
  Database
} from 'lucide-react';
import type { BoardDocument } from '../types';

interface SidebarProps {
  isOpen: boolean;
  documents: BoardDocument[];
  activeDocId: string;
  isCloudSynced: boolean;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onExportAll: () => void;
  onImportBackup: (file: File) => void;
  onOpenCommandPalette: () => void;
  onOpenSupabase: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  documents,
  activeDocId,
  isCloudSynced,
  onSelectDocument,
  onCreateDocument,
  onDuplicateDocument,
  onDeleteDocument,
  onExportAll,
  onImportBackup,
  onOpenCommandPalette,
  onOpenSupabase,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-in fade-in duration-150"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/[0.08] flex flex-col z-50 transition-transform duration-200 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 font-black text-base tracking-tighter">
              C
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                Clustr
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                  Pro
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none">
                Spatial Scratchpad & Todos
              </p>
            </div>
          </div>

          {/* Quick Spotlight Shortcut Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Open Spotlight (Cmd+K)"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 focus-within:border-indigo-500/60 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter spaces..."
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
            />
            <button
              onClick={onOpenCommandPalette}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-white/10 text-slate-400 border border-slate-200 dark:border-white/10 hover:text-indigo-500 transition-colors shrink-0"
              title="Open Spotlight"
            >
              ⌘K
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Spaces ({documents.length})
            </span>
            <button
              onClick={onCreateDocument}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Create Space"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {filteredDocs.map((doc) => {
            const isActive = doc.id === activeDocId;
            const totalTodos = doc.cards.reduce((acc, c) => acc + (c.todos?.length || 0), 0);
            const doneTodos = doc.cards.reduce((acc, c) => acc + (c.todos?.filter(t => t.completed).length || 0), 0);

            return (
              <div
                key={doc.id}
                onClick={() => {
                  onSelectDocument(doc.id);
                  onCloseMobile();
                }}
                className={`group relative flex items-center justify-between p-2.5 rounded-2xl text-left cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 text-indigo-950 dark:text-indigo-100 font-semibold shadow-xs border border-indigo-200/80 dark:border-indigo-800/60'
                    : 'hover:bg-slate-100/80 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-xl shrink-0 p-1 rounded-xl bg-white/70 dark:bg-white/5 shadow-xs">
                    {doc.icon || '📝'}
                  </span>
                  <div className="truncate flex-1">
                    <div className="truncate text-xs font-semibold tracking-tight">{doc.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {doc.clusters.length} clusters • {totalTodos > 0 ? `${doneTodos}/${totalTodos} done` : `${doc.cards.length} cards`}
                    </div>
                  </div>
                </div>

                {/* Hover actions */}
                <div 
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onDuplicateDocument(doc.id)}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {documents.length > 1 && (
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 rounded-md text-slate-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer & Cloud Status */}
        <div className="p-3 border-t border-slate-100 dark:border-white/[0.08] space-y-2 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            onClick={onCreateDocument}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Space / Document</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onExportAll}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-semibold transition-colors"
              title="Download backup file"
            >
              <Download className="w-3 h-3" /> Backup
            </button>

            <label
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Restore from JSON backup"
            >
              <Upload className="w-3 h-3" /> Restore
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Cloud Sync Status Pill */}
          <div 
            onClick={onOpenSupabase}
            className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/50 cursor-pointer text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between transition-colors group"
          >
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold">
                {isCloudSynced ? 'Supabase Synced' : 'Local Storage Mode'}
              </span>
            </div>
            <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          </div>
        </div>
      </aside>
    </>
  );
};
