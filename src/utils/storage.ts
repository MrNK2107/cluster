import type { WorkspaceData, BoardDocument } from '../types';

const STORAGE_KEY = 'clustr_workspace_v1';

export const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; text: string; header: string }> = {
  default: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    text: 'text-slate-900 dark:text-slate-100',
    header: 'bg-slate-50 dark:bg-slate-800/60',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/60',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    text: 'text-amber-950 dark:text-amber-100',
    header: 'bg-amber-100/70 dark:bg-amber-900/40',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    text: 'text-emerald-950 dark:text-emerald-100',
    header: 'bg-emerald-100/70 dark:bg-emerald-900/40',
  },
  blue: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800/60',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
    text: 'text-sky-950 dark:text-sky-100',
    header: 'bg-sky-100/70 dark:bg-sky-900/40',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800/60',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    text: 'text-purple-950 dark:text-purple-100',
    header: 'bg-purple-100/70 dark:bg-purple-900/40',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-200 dark:border-pink-800/60',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
    text: 'text-pink-950 dark:text-pink-100',
    header: 'bg-pink-100/70 dark:bg-pink-900/40',
  },
  amber: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800/60',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
    text: 'text-orange-950 dark:text-orange-100',
    header: 'bg-orange-100/70 dark:bg-orange-900/40',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/60',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    text: 'text-rose-950 dark:text-rose-100',
    header: 'bg-rose-100/70 dark:bg-rose-900/40',
  },
};

export const INITIAL_DOCUMENTS: BoardDocument[] = [
  {
    id: 'doc-hostel-setup',
    title: '🏨 Hostel & Property Hub',
    description: 'Operations, inventory, daily check-ins & guest to-dos',
    icon: '🏨',
    color: '#0284c7',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewport: { x: 80, y: 80, zoom: 1 },
    clusters: [
      {
        id: 'cluster-daily',
        title: '☀️ Daily Morning Routine',
        color: 'blue',
        x: 60,
        y: 60,
        width: 380,
        height: 520,
        createdAt: Date.now(),
      },
      {
        id: 'cluster-supplies',
        title: '📦 Supplies & Maintenance',
        color: 'yellow',
        x: 480,
        y: 60,
        width: 400,
        height: 520,
        createdAt: Date.now(),
      },
      {
        id: 'cluster-ideas',
        title: '💡 Guest Experience & Events',
        color: 'purple',
        x: 920,
        y: 60,
        width: 380,
        height: 520,
        createdAt: Date.now(),
      },
    ],
    cards: [
      {
        id: 'card-1',
        clusterId: 'cluster-daily',
        type: 'todo',
        title: 'Check-in Desk Priority',
        x: 80,
        y: 130,
        color: 'blue',
        tags: ['#urgent', '#frontdesk'],
        todos: [
          { id: 't1', text: 'Inspect common room & reception area', completed: true, priority: 'high' },
          { id: 't2', text: 'Review today’s 14 incoming check-ins', completed: true, priority: 'high' },
          { id: 't3', text: 'Check key card inventory & reset spares', completed: false, priority: 'medium' },
          { id: 't4', text: 'Verify Wi-Fi speed & lounge router status', completed: false, priority: 'low' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-counter-1',
        clusterId: 'cluster-daily',
        type: 'counter',
        title: 'Guests Checked-in Today',
        counterLabel: 'Guests',
        counterValue: 12,
        x: 80,
        y: 390,
        color: 'default',
        tags: ['#metrics'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-2',
        clusterId: 'cluster-supplies',
        type: 'todo',
        title: 'Procurement & Linens',
        x: 500,
        y: 130,
        color: 'yellow',
        tags: ['#inventory', '#orders'],
        todos: [
          { id: 't5', text: 'Order 50 sets of fresh cotton pillowcases', completed: false, priority: 'high' },
          { id: 't6', text: 'Refill shower gel & eco hand soap in Dorm 3', completed: true, priority: 'medium' },
          { id: 't7', text: 'Fix AC remote sensor in Room 204', completed: false, priority: 'high' },
          { id: 't8', text: 'Check backup water pump pressure valve', completed: true, priority: 'low' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-note-1',
        clusterId: 'cluster-supplies',
        type: 'note',
        title: 'Plumber & Vendor Contacts',
        noteContent: 'Emergency Plumber: Ravi (+91 98765-43210)\nLaundry vendor pickup: 10:30 AM every Tue & Fri.\nHardware store account: #H-492 at City Tools.',
        x: 500,
        y: 390,
        color: 'yellow',
        tags: ['#contacts', '#vendors'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-3',
        clusterId: 'cluster-ideas',
        type: 'sticky',
        title: 'Friday Rooftop Acoustic Night!',
        noteContent: 'Setup warm fairy lights, buy organic herbal tea & mocktail ingredients. Announce on guest WhatsApp group by Thursday noon.',
        x: 940,
        y: 130,
        color: 'purple',
        tags: ['#events', '#social'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-4',
        clusterId: 'cluster-ideas',
        type: 'links',
        title: 'Local Guides & Recommendations',
        x: 940,
        y: 340,
        color: 'purple',
        tags: ['#guesttips'],
        bookmarks: [
          { id: 'b1', title: 'Top 10 Street Food Spots Nearby', url: 'https://maps.google.com' },
          { id: 'b2', title: 'Weekend Hiking Trail Map', url: 'https://alltrails.com' },
          { id: 'b3', title: 'Scooter & Bike Rental Hotline', url: 'tel:+910000000000' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-floating-1',
        clusterId: null,
        type: 'sticky',
        title: 'Quick Brain Dump ⚡',
        noteContent: 'Remember to check whether solar water heater timer is synced with daylight savings time.',
        x: 920,
        y: 610,
        color: 'rose',
        tags: ['#scratchpad'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    connections: [
      {
        id: 'conn-1',
        fromId: 'card-1',
        toId: 'card-counter-1',
        label: 'updates',
      },
    ],
  },
  {
    id: 'doc-brain-dump',
    title: '🧠 Unstructured Life Scratchpad',
    description: 'Freeform thoughts, random tasks, clusters of ideas',
    icon: '⚡',
    color: '#8b5cf6',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewport: { x: 100, y: 100, zoom: 1 },
    clusters: [
      {
        id: 'cluster-must-do',
        title: '🔥 Must Do Before Midnight',
        color: 'rose',
        x: 80,
        y: 60,
        width: 360,
        height: 480,
        createdAt: Date.now(),
      },
      {
        id: 'cluster-someday',
        title: '🌱 Someday / Explore',
        color: 'green',
        x: 480,
        y: 60,
        width: 360,
        height: 480,
        createdAt: Date.now(),
      },
    ],
    cards: [
      {
        id: 'card-urgent-1',
        clusterId: 'cluster-must-do',
        type: 'todo',
        title: 'Urgent Tasks',
        x: 100,
        y: 130,
        color: 'rose',
        tags: ['#urgent', '#today'],
        todos: [
          { id: 't10', text: 'Pay internet utility bill', completed: true, priority: 'high' },
          { id: 't11', text: 'Send updated contract draft', completed: false, priority: 'high' },
          { id: 't12', text: 'Order replacement laptop charger', completed: false, priority: 'medium' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-someday-1',
        clusterId: 'cluster-someday',
        type: 'note',
        title: 'Side Project Inspirations',
        noteContent: '- Offline-first local apps\n- Ambient noise generator for deep work\n- Minimalist digital garden\n- Kinetic typography experiments',
        x: 500,
        y: 130,
        color: 'green',
        tags: ['#ideas'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    connections: [],
  },
];

export function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.documents) && parsed.documents.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse workspace from localStorage', e);
  }

  const initial: WorkspaceData = {
    version: 1,
    activeDocId: INITIAL_DOCUMENTS[0].id,
    documents: INITIAL_DOCUMENTS,
    theme: 'dark',
  };
  saveWorkspace(initial);
  return initial;
}

export function saveWorkspace(data: WorkspaceData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save workspace', e);
  }
}

export function exportWorkspaceJSON(data: WorkspaceData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clustr-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDocumentJSON(doc: BoardDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
