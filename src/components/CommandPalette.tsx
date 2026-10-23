import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  CheckSquare, 
  FileText, 
  StickyNote, 
  Layers, 
  Moon, 
  Sun, 
  Database, 
  Share2, 
  Map, 
  LayoutGrid, 
  FolderOpen
} from 'lucide-react';
import type { BoardDocument, CardType } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  documents: BoardDocument[];
  activeDocument: BoardDocument;
  theme: 'dark' | 'light';
  viewMode: 'canvas' | 'feed';
  onClose: () => void;
  onSelectDocument: (docId: string) => void;
  onAddCard: (type: CardType) => void;
  onAddCluster: () => void;
  onToggleTheme: () => void;
  onToggleViewMode: () => void;
  onOpenSupabase: () => void;
  onOpenShare: () => void;
  onFocusCard: (cardId: string) => void;
}

interface PaletteItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: any;
  perform: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  documents,
  activeDocument,
  theme,
  viewMode,
  onClose,
  onSelectDocument,
  onAddCard,
  onAddCluster,
  onToggleTheme,
  onToggleViewMode,
  onOpenSupabase,
  onOpenShare,
  onFocusCard,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const actions: PaletteItem[] = [
    {
      id: 'action-todo',
      category: 'Quick Actions',
      title: 'Create New Task Checklist',
      icon: CheckSquare,
      shortcut: 'T',
      perform: () => onAddCard('todo'),
    },
    {
      id: 'action-note',
      category: 'Quick Actions',
      title: 'Create Unstructured Note',
      icon: FileText,
      shortcut: 'N',
      perform: () => onAddCard('note'),
    },
    {
      id: 'action-sticky',
      category: 'Quick Actions',
      title: 'Create Sticky Reminder',
      icon: StickyNote,
      shortcut: 'S',
      perform: () => onAddCard('sticky'),
    },
    {
      id: 'action-cluster',
      category: 'Quick Actions',
      title: 'Create New Cluster Group',
      icon: Layers,
      shortcut: 'C',
      perform: () => onAddCluster(),
    },
    {
      id: 'action-view',
      category: 'Quick Actions',
      title: `Switch View (Currently ${viewMode === 'canvas' ? 'Spatial Canvas' : 'Mobile Feed'})`,
      icon: viewMode === 'canvas' ? LayoutGrid : Map,
      shortcut: 'V',
      perform: () => onToggleViewMode(),
    },
    {
      id: 'action-theme',
      category: 'Quick Actions',
      title: `Toggle Theme (Currently ${theme === 'dark' ? 'Dark' : 'Light'})`,
      icon: theme === 'dark' ? Sun : Moon,
      shortcut: 'M',
      perform: () => onToggleTheme(),
    },
    {
      id: 'action-supabase',
      category: 'Quick Actions',
      title: 'Supabase Cloud Sync & Account',
      icon: Database,
      perform: () => onOpenSupabase(),
    },
    {
      id: 'action-share',
      category: 'Quick Actions',
      title: 'Export Markdown & Snapshot Link',
      icon: Share2,
      shortcut: 'E',
      perform: () => onOpenShare(),
    },
  ];

  const docItems: PaletteItem[] = documents.map((doc) => ({
    id: `doc-${doc.id}`,
    category: 'Documents & Spaces',
    title: `Switch to "${doc.title}"`,
    icon: FolderOpen,
    subtitle: `${doc.clusters.length} clusters • ${doc.cards.length} cards`,
    perform: () => onSelectDocument(doc.id),
  }));

  const cardItems: PaletteItem[] = activeDocument.cards.map((card) => {
    let preview = card.title;
    if (card.todos && card.todos.length > 0) {
      preview += ` (${card.todos.filter(t => t.completed).length}/${card.todos.length} done)`;
    } else if (card.noteContent) {
      preview += ` — ${card.noteContent.slice(0, 40)}`;
    }
    return {
      id: `card-${card.id}`,
      category: 'Cards & Notes in this Space',
      title: card.title,
      icon: card.type === 'todo' ? CheckSquare : card.type === 'note' ? FileText : StickyNote,
      subtitle: preview,
      perform: () => onFocusCard(card.id),
    };
  });

  const allItems: PaletteItem[] = [...actions, ...docItems, ...cardItems];
  const filtered = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) {
        item.perform();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-start justify-center pt-20 px-4 z-50 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[70vh] glass-panel"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.08] gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search tasks, or switch spaces..."
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto space-y-1 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No results found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.perform();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          isSelected
                            ? 'bg-white/20 border-white/30 text-white'
                            : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Clustr Spotlight</span>
        </div>
      </div>
    </div>
  );
};
