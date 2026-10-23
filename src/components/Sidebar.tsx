import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Search, 
  Sparkles, 
  FolderPlus 
} from 'lucide-react';
import type { BoardDocument } from '../types';

interface SidebarProps {
  isOpen: boolean;
  documents: BoardDocument[];
  activeDocId: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDuplicateDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onExportAll: () => void;
  onImportBackup: (file: File) => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  documents,
  activeDocId,
  onSelectDocument,
  onCreateDocument,
  onDuplicateDocument,
  onDeleteDocument,
  onExportAll,
  onImportBackup,
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
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform duration-200 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold text-base">
              C
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-slate-800 dark:text-slate-100">
                Clustr
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                Unstructured Todos & Canvases
              </p>
            </div>
          </div>
        </div>

        {/* Quick Search */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full text-xs pl-8 pr-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Documents & Spaces ({documents.length})
            </span>
            <button
              onClick={onCreateDocument}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Create New Document"
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
                className={`group relative flex items-center justify-between p-2 rounded-xl text-left cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 font-semibold shadow-xs border border-indigo-200/60 dark:border-indigo-800/60'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-lg shrink-0">{doc.icon || '📝'}</span>
                  <div className="truncate">
                    <div className="truncate text-xs">{doc.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {doc.clusters.length} clusters • {totalTodos > 0 ? `${doneTodos}/${totalTodos} done` : `${doc.cards.length} cards`}
                    </div>
                  </div>
                </div>

                {/* Actions on hover */}
                <div 
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onDuplicateDocument(doc.id)}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Duplicate Document"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {documents.length > 1 && (
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-slate-400 hover:text-rose-600"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer & Backup Tools */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onCreateDocument}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Space / Document</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onExportAll}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium"
              title="Download backup file"
            >
              <Download className="w-3 h-3" /> Backup JSON
            </button>

            <label
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium cursor-pointer"
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

          {/* 100% Free Badge */}
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[10px] text-emerald-800 dark:text-emerald-300">
            <div className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              100% Free Forever
            </div>
            <p className="mt-0.5 leading-snug text-emerald-700/90 dark:text-emerald-400/90">
              Zero server fees. Local-first in your browser. Deploy for free anywhere.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
