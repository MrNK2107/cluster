import React, { useState } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import type { BoardDocument } from '../types';

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

  if (!isOpen) return null;

  const templates = [
    {
      title: 'Blank Infinite Canvas',
      icon: '✨',
      description: 'Clean slate ready for loose thoughts, tasks, and clusters.',
      color: '#6366f1',
      clusters: [],
      cards: [],
    },
    {
      title: 'Hostel & Hospitality Hub',
      icon: '🏨',
      description: 'Morning routines, inventory procurement, guest events & contacts.',
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
      title: 'Sprint & Project Board',
      icon: '🚀',
      description: 'Current sprint goals, immediate blockers, and backlog.',
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
      title: 'Weekly Brain-dump & Scratchpad',
      icon: '🧠',
      description: 'Fluid thoughts, stream of consciousness, untangling ideas.',
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
      icon: customIcon || tpl.icon,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Create New Document / Space
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Document Title (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                className="w-12 text-center text-lg p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Hostel Renovation, Side Hustle..."
                className="flex-1 text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Choose a starter layout:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((tpl, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer transition-all group"
                >
                  <span className="text-2xl shrink-0 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                    {tpl.icon}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {tpl.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {tpl.description}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 self-center" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
