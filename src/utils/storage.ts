import type { WorkspaceData, BoardDocument } from '../types';
import { sanitizeWorkspace } from './validate';

const LEGACY_STORAGE_KEY = 'clustr_workspace_v1';


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
          { id: 'b1', title: 'Curated Street Food Walk (Map)', url: 'https://maps.google.com/' },
          { id: 'b2', title: 'Sunrise Viewpoint Hiking Trail', url: 'https://alltrails.com/' },
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

/** What a brand-new account starts with: one empty space, no sample content. */
export function createEmptyWorkspace(): WorkspaceData {
  const now = Date.now();
  const prefersDark =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  return {
    version: 1,
    activeDocId: 'doc-first-space',
    documents: [
      {
        id: 'doc-first-space',
        title: 'My space',
        icon: '✨',
        color: '#3d5afe',
        createdAt: now,
        updatedAt: now,
        viewport: { x: 0, y: 0, zoom: 1 },
        clusters: [],
        cards: [],
        connections: [],
      },
    ],
    theme: prefersDark ? 'dark' : 'light',
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

/** The only account that may inherit data kept in this browser before accounts existed. */
export const OWNER_EMAIL = 'nandakishorsureshpriya@gmail.com';

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}

/** A space's content with timestamps and camera position left out, for comparing. */
function sampleFingerprint(doc: BoardDocument): string {
  return JSON.stringify(
    {
      title: doc.title,
      clusters: doc.clusters,
      cards: doc.cards,
      connections: doc.connections,
    },
    (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') return undefined;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Saved copies come back with keys in a different order.
        return Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]]));
      }
      return value;
    },
  );
}

/**
 * Accounts created before new accounts started empty were given the sample
 * spaces. Remove those spaces when they are still exactly as shipped, keeping
 * anything the person changed. Returns null when nothing needs removing.
 */
export function removeUntouchedSamples(ws: WorkspaceData): WorkspaceData | null {
  const samples = new Map(INITIAL_DOCUMENTS.map((d) => [d.id, sampleFingerprint(d)]));
  const kept = ws.documents.filter((d) => samples.get(d.id) !== sampleFingerprint(d));
  if (kept.length === ws.documents.length) return null;
  if (kept.length === 0) return { ...createEmptyWorkspace(), theme: ws.theme };
  const activeDocId = kept.some((d) => d.id === ws.activeDocId) ? ws.activeDocId : kept[0].id;
  return { ...ws, documents: kept, activeDocId };
}
