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
  LogIn
} from 'lucide-react';
import type { BoardDocument } from '../types';

interface SidebarProps {
  isOpen: boolean;
  documents: BoardDocument[];
  activeDocId: string;
  userEmail: string | null;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onExportAll: () => void;
  onImportBackup: (file: File) => void;
  onOpenCommandPalette: () => void;
  onOpenAccount: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  documents,
  activeDocId,
  userEmail,
  onSelectDocument,
  onCreateDocument,
  onDuplicateDocument,
  onDeleteDocument,
  onExportAll,
  onImportBackup,
  onOpenCommandPalette,
  onOpenAccount,
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
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform duration-200 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
              C
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                Clustr
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spatial Scratchpad & Todos
              </p>
            </div>
          </div>

          {/* Quick Spotlight Shortcut Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Open Spotlight (Cmd+K)"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-transparent focus-within:border-indigo-500/60 focus-within:bg-white dark:focus-within:bg-slate-950 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter spaces..."
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            <button
              onClick={onOpenCommandPalette}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-indigo-500 transition-colors shrink-0"
              title="Open Spotlight"
            >
              ⌘K
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Spaces ({documents.length})
            </span>
            <button
              onClick={onCreateDocument}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                className={`group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer border transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-950 dark:text-indigo-100 border-indigo-200 dark:border-indigo-500/25'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {doc.icon || '📝'}
                  </span>
                  <div className="truncate flex-1">
                    <div className="truncate text-sm font-medium tracking-tight">{doc.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
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
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {documents.length > 1 && (
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-md text-slate-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            onClick={onCreateDocument}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors active:scale-[0.98]"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New space</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onExportAll}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
              title="Download backup file"
            >
              <Download className="w-3.5 h-3.5" /> Backup
            </button>

            <label
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              title="Restore from JSON backup"
            >
              <Upload className="w-3.5 h-3.5" /> Restore
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Account */}
          <button
            onClick={onOpenAccount}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
          >
            {userEmail ? (
              <>
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {userEmail[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{userEmail}</span>
              </>
            ) : (
              <>
                <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sign in</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
