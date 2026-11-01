import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckSquare,
  FileText,
  StickyNote,
  Layers,
  Moon,
  Sun,
  UserRound,
  Map,
  LayoutGrid,
  FolderOpen
} from 'lucide-react';
import type { BoardDocument, CardType } from '../types';
import { Kbd } from './ui';

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
  onOpenAccount: () => void;
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
  onOpenAccount,
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
      category: 'Actions',
      title: 'Add a to-do list',
      icon: CheckSquare,
      shortcut: 'T',
      perform: () => onAddCard('todo'),
    },
    {
      id: 'action-note',
      category: 'Actions',
      title: 'Add a note',
      icon: FileText,
      shortcut: 'N',
      perform: () => onAddCard('note'),
    },
    {
      id: 'action-sticky',
      category: 'Actions',
      title: 'Add a sticky',
      icon: StickyNote,
      shortcut: 'S',
      perform: () => onAddCard('sticky'),
    },
    {
      id: 'action-cluster',
      category: 'Actions',
      title: 'Add a cluster',
      icon: Layers,
      shortcut: 'C',
      perform: () => onAddCluster(),
    },
    {
      id: 'action-view',
      category: 'Actions',
      title: viewMode === 'canvas' ? 'Switch to list view' : 'Switch to canvas view',
      icon: viewMode === 'canvas' ? LayoutGrid : Map,
      
      perform: () => onToggleViewMode(),
    },
    {
      id: 'action-theme',
      category: 'Actions',
      title: theme === 'dark' ? 'Use light theme' : 'Use dark theme',
      icon: theme === 'dark' ? Sun : Moon,
      
      perform: () => onToggleTheme(),
    },
    {
      id: 'action-account',
      category: 'Actions',
      title: 'Account',
      icon: UserRound,
      perform: () => onOpenAccount(),
    },
  ];

  const docItems: PaletteItem[] = documents.map((doc) => ({
    id: `doc-${doc.id}`,
    category: 'Spaces',
    title: doc.title,
    icon: FolderOpen,
    subtitle: `${doc.clusters.length} clusters, ${doc.cards.length} cards`,
    perform: () => onSelectDocument(doc.id),
  }));

  const cardItems: PaletteItem[] = activeDocument.cards.map((card) => {
    let preview = '';
    if (card.todos && card.todos.length > 0) {
      preview = `${card.todos.filter(t => t.completed).length} of ${card.todos.length} done`;
    } else if (card.noteContent) {
      preview = card.noteContent.slice(0, 60);
    }
    return {
      id: `card-${card.id}`,
      category: 'Cards in this space',
      title: card.title,
      icon: card.type === 'todo' ? CheckSquare : card.type === 'note' ? FileText : StickyNote,
      subtitle: preview || undefined,
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

  let lastCategory = '';

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] bg-ink-950/45 backdrop-blur-[3px] animate-fade-in select-none"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[70vh] flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-ink-900 ring-1 ring-ink-900/[0.06] dark:ring-white/10 float-shadow animate-pop-in"
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-100 dark:border-ink-800">
          <Search className="w-5 h-5 text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search cards, spaces and actions"
            aria-label="Search"
            className="w-full bg-transparent text-[16px] text-ink-900 dark:text-white placeholder:text-ink-400 outline-none"
          />
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <p className="font-display text-lg font-bold text-ink-900 dark:text-white">No matches</p>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Try a card title, a space, or “add”.</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              const heading = item.category !== lastCategory ? item.category : null;
              lastCategory = item.category;
              return (
                <React.Fragment key={item.id}>
                  {heading && <div className="px-3 pt-3 pb-1.5 text-[12px] font-semibold text-ink-400 dark:text-ink-500">{heading}</div>}
                  <div
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      item.perform();
                      onClose();
                    }}
                    onMouseMove={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 px-3 h-12 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand-600 text-white' : 'text-ink-700 dark:text-ink-200'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-white/15' : 'bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{item.title}</div>
                      {item.subtitle && (
                        <div className={`truncate text-[12px] ${isSelected ? 'text-brand-100' : 'text-ink-400 dark:text-ink-500'}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {item.shortcut && (
                      <Kbd className={isSelected ? 'bg-white/15 text-white ring-white/20 dark:bg-white/15 dark:text-white dark:ring-white/20' : ''}>
                        {item.shortcut}
                      </Kbd>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-5 h-11 border-t border-ink-100 dark:border-ink-800 text-[12px] text-ink-400">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
          <span className="flex items-center gap-1.5"><Kbd>Enter</Kbd> to open</span>
        </div>
      </div>
    </div>
  );
};
