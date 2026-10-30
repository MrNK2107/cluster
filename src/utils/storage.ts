import type { WorkspaceData, BoardDocument } from '../types';
import { sanitizeWorkspace } from './validate';

const LEGACY_STORAGE_KEY = 'clustr_workspace_v1';

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
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    text: 'text-slate-900 dark:text-slate-100',
    header: 'bg-slate-50 dark:bg-slate-800/50',
    glow: 'hover:border-slate-300 dark:hover:border-slate-700',
    accent: '#64748b',
  },
  blue: {
    bg: 'bg-sky-50 dark:bg-slate-900',
    border: 'border-sky-200 dark:border-sky-500/25',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    text: 'text-sky-950 dark:text-sky-100',
    header: 'bg-sky-100/70 dark:bg-sky-500/10',
    glow: 'hover:border-sky-300 dark:hover:border-sky-500/50',
    accent: '#0ea5e9',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-slate-900',
    border: 'border-emerald-200 dark:border-emerald-500/25',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    text: 'text-emerald-950 dark:text-emerald-100',
    header: 'bg-emerald-100/70 dark:bg-emerald-500/10',
    glow: 'hover:border-emerald-300 dark:hover:border-emerald-500/50',
    accent: '#10b981',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-slate-900',
    border: 'border-amber-200 dark:border-amber-500/25',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    text: 'text-amber-950 dark:text-amber-100',
    header: 'bg-amber-100/70 dark:bg-amber-500/10',
    glow: 'hover:border-amber-300 dark:hover:border-amber-500/50',
    accent: '#f59e0b',
  },
  purple: {
    bg: 'bg-violet-50 dark:bg-slate-900',
    border: 'border-violet-200 dark:border-violet-500/25',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    text: 'text-violet-950 dark:text-violet-100',
    header: 'bg-violet-100/70 dark:bg-violet-500/10',
    glow: 'hover:border-violet-300 dark:hover:border-violet-500/50',
    accent: '#8b5cf6',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-slate-900',
    border: 'border-pink-200 dark:border-pink-500/25',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300',
    text: 'text-pink-950 dark:text-pink-100',
    header: 'bg-pink-100/70 dark:bg-pink-500/10',
    glow: 'hover:border-pink-300 dark:hover:border-pink-500/50',
    accent: '#ec4899',
  },
  amber: {
    bg: 'bg-orange-50 dark:bg-slate-900',
    border: 'border-orange-200 dark:border-orange-500/25',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
    text: 'text-orange-950 dark:text-orange-100',
    header: 'bg-orange-100/70 dark:bg-orange-500/10',
    glow: 'hover:border-orange-300 dark:hover:border-orange-500/50',
    accent: '#f97316',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-slate-900',
    border: 'border-rose-200 dark:border-rose-500/25',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    text: 'text-rose-950 dark:text-rose-100',
    header: 'bg-rose-100/70 dark:bg-rose-500/10',
    glow: 'hover:border-rose-300 dark:hover:border-rose-500/50',
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

export function createStarterWorkspace(): WorkspaceData {
  return {
    version: 1,
    activeDocId: INITIAL_DOCUMENTS[0].id,
    documents: INITIAL_DOCUMENTS,
    theme: 'dark',
  };
}

/**
 * Workspaces used to live in this browser only. Read that copy once so the
 * first sign-in can carry it into the account instead of the starter data.
 */
export function readLegacyLocalWorkspace(): WorkspaceData | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? sanitizeWorkspace(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearLegacyLocalWorkspace(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    indexedDB.deleteDatabase('ClustrDB');
  } catch {
    // Nothing to clean up.
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
