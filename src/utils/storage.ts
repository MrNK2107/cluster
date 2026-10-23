import type { WorkspaceData, BoardDocument } from '../types';

const STORAGE_KEY = 'clustr_workspace_v1';

export const COLOR_MAP: Record<string, { 
  bg: string; 
  border: string; 
  badge: string; 
  text: string; 
  header: string;
  glow: string;
  accent: string;
}> = {
  default: {
    bg: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
    border: 'border-slate-200/80 dark:border-white/[0.08]',
    badge: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
    text: 'text-slate-900 dark:text-slate-100',
    header: 'bg-slate-50/70 dark:bg-slate-800/40',
    glow: 'hover:border-slate-400/50 dark:hover:border-white/20',
    accent: '#64748b',
  },
  blue: {
    bg: 'bg-sky-50/75 dark:bg-sky-950/30 backdrop-blur-md',
    border: 'border-sky-200/80 dark:border-sky-800/50',
    badge: 'bg-sky-100/80 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
    text: 'text-sky-950 dark:text-sky-100',
    header: 'bg-sky-100/60 dark:bg-sky-900/30',
    glow: 'hover:border-sky-400/60 dark:hover:border-sky-500/50',
    accent: '#0ea5e9',
  },
  green: {
    bg: 'bg-emerald-50/75 dark:bg-emerald-950/30 backdrop-blur-md',
    border: 'border-emerald-200/80 dark:border-emerald-800/50',
    badge: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    text: 'text-emerald-950 dark:text-emerald-100',
    header: 'bg-emerald-100/60 dark:bg-emerald-900/30',
    glow: 'hover:border-emerald-400/60 dark:hover:border-emerald-500/50',
    accent: '#10b981',
  },
  yellow: {
    bg: 'bg-amber-50/75 dark:bg-amber-950/30 backdrop-blur-md',
    border: 'border-amber-200/80 dark:border-amber-800/50',
    badge: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    text: 'text-amber-950 dark:text-amber-100',
    header: 'bg-amber-100/60 dark:bg-amber-900/30',
    glow: 'hover:border-amber-400/60 dark:hover:border-amber-500/50',
    accent: '#f59e0b',
  },
  purple: {
    bg: 'bg-violet-50/75 dark:bg-violet-950/30 backdrop-blur-md',
    border: 'border-violet-200/80 dark:border-violet-800/50',
    badge: 'bg-violet-100/80 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
    text: 'text-violet-950 dark:text-violet-100',
    header: 'bg-violet-100/60 dark:bg-violet-900/30',
    glow: 'hover:border-violet-400/60 dark:hover:border-violet-500/50',
    accent: '#8b5cf6',
  },
  pink: {
    bg: 'bg-pink-50/75 dark:bg-pink-950/30 backdrop-blur-md',
    border: 'border-pink-200/80 dark:border-pink-800/50',
    badge: 'bg-pink-100/80 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
    text: 'text-pink-950 dark:text-pink-100',
    header: 'bg-pink-100/60 dark:bg-pink-900/30',
    glow: 'hover:border-pink-400/60 dark:hover:border-pink-500/50',
    accent: '#ec4899',
  },
  amber: {
    bg: 'bg-orange-50/75 dark:bg-orange-950/30 backdrop-blur-md',
    border: 'border-orange-200/80 dark:border-orange-800/50',
    badge: 'bg-orange-100/80 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
    text: 'text-orange-950 dark:text-orange-100',
    header: 'bg-orange-100/60 dark:bg-orange-900/30',
    glow: 'hover:border-orange-400/60 dark:hover:border-orange-500/50',
    accent: '#f97316',
  },
  rose: {
    bg: 'bg-rose-50/75 dark:bg-rose-950/30 backdrop-blur-md',
    border: 'border-rose-200/80 dark:border-rose-800/50',
    badge: 'bg-rose-100/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    text: 'text-rose-950 dark:text-rose-100',
    header: 'bg-rose-100/60 dark:bg-rose-900/30',
    glow: 'hover:border-rose-400/60 dark:hover:border-rose-500/50',
    accent: '#f43f5e',
  },
};

export const INITIAL_DOCUMENTS: BoardDocument[] = [
  {
    id: 'doc-hostel-setup',
    title: '🏨 Property & Hostel Operations',
    description: 'Daily check-ins, guest experiences, and maintenance scratchpad',
    icon: '🏨',
    color: '#0284c7',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewport: { x: 80, y: 80, zoom: 1 },
    clusters: [
      {
        id: 'cluster-daily',
        title: '☀️ Morning Reception Routine',
        color: 'blue',
        x: 60,
        y: 60,
        width: 380,
        height: 520,
        createdAt: Date.now(),
      },
      {
        id: 'cluster-supplies',
        title: '📦 Supplies & Procurement',
        color: 'yellow',
        x: 480,
        y: 60,
        width: 400,
        height: 520,
        createdAt: Date.now(),
      },
      {
        id: 'cluster-ideas',
        title: '💡 Guest Vibes & Events',
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
          { id: 't1', text: 'Inspect common room & reception desk', completed: true, priority: 'high' },
          { id: 't2', text: 'Review today’s 14 incoming arrivals', completed: true, priority: 'high' },
          { id: 't3', text: 'Reset spare keycards & locker locks', completed: false, priority: 'medium' },
          { id: 't4', text: 'Verify lounge Wi-Fi speed & password card', completed: false, priority: 'low' },
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
        title: 'Linens & Facility Checks',
        x: 500,
        y: 130,
        color: 'yellow',
        tags: ['#inventory', '#maintenance'],
        todos: [
          { id: 't5', text: 'Order 50 sets of Egyptian cotton pillowcases', completed: false, priority: 'high' },
          { id: 't6', text: 'Refill shower gel & eco hand soap dispensers', completed: true, priority: 'medium' },
          { id: 't7', text: 'Inspect AC remote sensor in Room 204', completed: false, priority: 'high' },
          { id: 't8', text: 'Check backup water pump pressure gauge', completed: true, priority: 'low' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-note-1',
        clusterId: 'cluster-supplies',
        type: 'note',
        title: 'Emergency Vendor Directory',
        noteContent: 'Emergency Plumber: Ravi (+91 98765-43210)\nLaundry pickup: 10:30 AM every Tue & Fri\nHardware store: #H-492 City Tools (ask for Anil)',
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
        title: 'Friday Rooftop Sunset Acoustic 🎸',
        noteContent: 'Hang warm fairy lights, buy organic herbal teas & fresh citrus for welcome drinks. Announce on guest WhatsApp board by Thursday noon.',
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
        title: 'Local Discovery Guides',
        x: 940,
        y: 340,
        color: 'purple',
        tags: ['#guesttips'],
        bookmarks: [
          { id: 'b1', title: 'Curated Street Food Walk (Map)', url: 'https://maps.google.com' },
          { id: 'b2', title: 'Sunrise Viewpoint Hiking Trail', url: 'https://alltrails.com' },
          { id: 'b3', title: 'Local Scooter Rental Hotline', url: 'tel:+910000000000' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-floating-1',
        clusterId: null,
        type: 'sticky',
        title: 'Spontaneous Brain Dump ⚡',
        noteContent: 'Consider adding a communal book exchange nook in the garden corner next weekend.',
        x: 940,
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
        label: 'updates count',
      },
    ],
  },
  {
    id: 'doc-life-scratchpad',
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
        title: '🔥 High Priority Today',
        color: 'rose',
        x: 80,
        y: 60,
        width: 360,
        height: 480,
        createdAt: Date.now(),
      },
      {
        id: 'cluster-someday',
        title: '🌱 Someday Explorations',
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
        title: 'Must Accomplish',
        x: 100,
        y: 130,
        color: 'rose',
        tags: ['#urgent', '#today'],
        todos: [
          { id: 't10', text: 'Pay high-speed fiber internet invoice', completed: true, priority: 'high' },
          { id: 't11', text: 'Send revised contract draft', completed: false, priority: 'high' },
          { id: 't12', text: 'Order backup 65W GaN laptop charger', completed: false, priority: 'medium' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'card-someday-1',
        clusterId: 'cluster-someday',
        type: 'note',
        title: 'Creative Inspirations',
        noteContent: '• Local-first peer-to-peer web apps\n• Ambient noise generator with binaural beats\n• Minimalist digital garden & thought trees\n• Tactile physics for web card components',
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
