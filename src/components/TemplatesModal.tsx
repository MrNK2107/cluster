import React, { useCallback, useEffect, useState } from 'react';
import { colorTheme } from '../theme/colors';
import { Dialog, MenuPanel, useDismiss } from './ui';
import { cn } from '../utils/cn';

const EMOJI = ['📌', '✨', '🏠', '🎯', '🚀', '🧠', '📚', '💼', '🛒', '✈️', '🎨', '🌱', '💡', '🏋️', '🎵', '🍳', '💸', '🗓️'];
import type { BoardDocument } from '../types';
import { DEFAULT_MEMBERS, newRota } from '../utils/rota';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithTemplate: (doc: BoardDocument) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onCreateWithTemplate,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [customIcon, setCustomIcon] = useState('📌');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const closeEmoji = useCallback(() => setEmojiOpen(false), []);
  const emojiRef = useDismiss(emojiOpen, closeEmoji);

  useEffect(() => {
    if (isOpen) {
      setCustomTitle('');
      setCustomIcon('📌');
    }
  }, [isOpen]);

  const templates = [
    {
      title: 'Blank canvas',
      icon: '✨',
      description: 'An empty canvas. Add whatever you need.',
      color: '#6366f1',
      clusters: [],
      cards: [],
    },
    {
      title: 'Hostel',
      icon: '🏠',
      description: 'Daily room-cleaning rota for four, with cover when someone is away.',
      color: '#0d9488',
      clusters: [],
      cards: [
        {
          id: `cd-${Date.now()}-rota`,
          clusterId: null,
          type: 'rota' as const,
          title: 'Room cleaning',
          x: 80,
          y: 80,
          width: 380,
          color: 'green' as const,
          tags: [],
          rota: newRota(DEFAULT_MEMBERS),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
    {
      title: 'Hostel & hospitality',
      icon: '🏨',
      description: 'Morning routines, supplies and guest events.',
      color: '#0284c7',
      clusters: [
        {
          id: `cl-${Date.now()}-1`,
          title: '☀️ Daily Morning Routine',
          color: 'blue' as const,
          x: 60,
          y: 60,
          width: 380,
          height: 480,
          createdAt: Date.now(),
        },
        {
          id: `cl-${Date.now()}-2`,
          title: '📦 Supplies & Maintenance',
          color: 'yellow' as const,
          x: 480,
          y: 60,
          width: 380,
          height: 480,
          createdAt: Date.now(),
        },
      ],
      cards: [
        {
          id: `cd-${Date.now()}-1`,
          clusterId: `cl-${Date.now()}-1`,
          type: 'todo' as const,
          title: 'Morning Front Desk',
          x: 80,
          y: 130,
          color: 'blue' as const,
          tags: ['#routine', '#reception'],
          todos: [
            { id: 't1', text: 'Greet incoming guests and check IDs', completed: false, priority: 'high' as const },
            { id: 't2', text: 'Confirm laundry shipment count', completed: false, priority: 'medium' as const },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
    {
      title: 'Project board',
      icon: '🚀',
      description: 'This week’s goals and what’s waiting.',
      color: '#10b981',
      clusters: [
        {
          id: `cl-${Date.now()}-1`,
          title: '🎯 This Week (Now)',
          color: 'green' as const,
          x: 60,
          y: 60,
          width: 360,
          height: 480,
          createdAt: Date.now(),
        },
        {
          id: `cl-${Date.now()}-2`,
          title: '⏳ In Progress / Waiting',
          color: 'amber' as const,
          x: 460,
          y: 60,
          width: 360,
          height: 480,
          createdAt: Date.now(),
        },
      ],
      cards: [
        {
          id: `cd-${Date.now()}-1`,
          clusterId: `cl-${Date.now()}-1`,
          type: 'todo' as const,
          title: 'Top Deliverables',
          x: 80,
          y: 130,
          color: 'green' as const,
          tags: ['#sprint', '#urgent'],
          todos: [
            { id: 't1', text: 'Ship public release draft', completed: false, priority: 'high' as const },
            { id: 't2', text: 'Fix navigation glitch on mobile', completed: false, priority: 'high' as const },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
    {
      title: 'Brain dump',
      icon: '🧠',
      description: 'A loose space to empty your head.',
      color: '#ec4899',
      clusters: [
        {
          id: `cl-${Date.now()}-1`,
          title: '⚡ Brain Dump Zone',
          color: 'pink' as const,
          x: 60,
          y: 60,
          width: 400,
          height: 500,
          createdAt: Date.now(),
        },
      ],
      cards: [
        {
          id: `cd-${Date.now()}-1`,
          clusterId: `cl-${Date.now()}-1`,
          type: 'note' as const,
          title: 'Loose Thoughts',
          noteContent: 'Jot down whatever comes to mind here...\n- No rules\n- Group later\n- Check off when done',
          x: 80,
          y: 130,
          color: 'pink' as const,
          tags: ['#thoughts'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    },
  ];

  const handleSelectTemplate = (tpl: typeof templates[0]) => {
    const newDoc: BoardDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: customTitle.trim() || tpl.title,
      description: tpl.description,
      icon: customTitle.trim() || customIcon !== '📌' ? customIcon : tpl.icon,
      color: tpl.color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clusters: tpl.clusters as any,
      cards: tpl.cards as any,
      connections: [],
      viewport: { x: 80, y: 80, zoom: 1 },
    };

    onCreateWithTemplate(newDoc);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="New space" description="Name it, then pick a starting point." className="sm:max-w-lg">
      <div className="flex gap-2">
        <div ref={emojiRef} className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Choose an icon"
            className="w-12 h-12 rounded-xl text-2xl flex items-center justify-center bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700 transition-colors"
          >
            {customIcon}
          </button>
          {emojiOpen && (
            <MenuPanel className="left-0 top-full mt-1.5 min-w-0 w-[232px] p-2 grid grid-cols-6 gap-1 origin-top-left">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setCustomIcon(e);
                    setEmojiOpen(false);
                  }}
                  className={cn('w-8 h-8 rounded-lg text-lg flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800', customIcon === e && 'bg-brand-50 ring-1 ring-brand-300 dark:bg-brand-500/15')}
                >
                  {e}
                </button>
              ))}
            </MenuPanel>
          )}
        </div>
        <input
          autoFocus
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSelectTemplate(templates[0]);
          }}
          placeholder="Space name, e.g. Flat move"
          aria-label="Space name"
          className="min-w-0 flex-1 h-12 px-4 rounded-xl text-[16px] font-semibold bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-white placeholder:font-normal placeholder:text-ink-400 outline-none ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="mt-5 mb-2 text-[13px] font-semibold text-ink-500 dark:text-ink-400">Start from</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {templates.map((tpl) => (
          <button
            key={tpl.title}
            type="button"
            onClick={() => handleSelectTemplate(tpl)}
            className="group text-left p-3.5 rounded-2xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700 hover:ring-2 hover:ring-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-500/5 transition-all active:scale-[0.99]"
          >
            <div className="h-16 rounded-xl bg-ink-100 dark:bg-ink-950 canvas-grid-dots relative overflow-hidden mb-3">
              {tpl.clusters.length === 0 ? (
                <span className="absolute inset-0 flex items-center justify-center text-2xl">{tpl.icon}</span>
              ) : (
                tpl.clusters.slice(0, 3).map((cl, i) => (
                  <span
                    key={cl.id}
                    className={cn('absolute top-3 h-3.5 w-14 rounded-full', colorTheme(cl.color).swatch)}
                    style={{ left: 10 + i * 64 }}
                  />
                ))
              )}
              {tpl.clusters.length > 0 && (
                <span className="absolute left-2.5 top-9 h-5 w-24 rounded-md bg-white dark:bg-ink-800 shadow-sm" />
              )}
            </div>
            <div className="font-display text-[15px] font-bold tracking-tight text-ink-950 dark:text-white">{tpl.title}</div>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-500 dark:text-ink-400">{tpl.description}</p>
          </button>
        ))}
      </div>
    </Dialog>
  );
};
