import type {
  BoardDocument,
  BookmarkItem,
  CardColor,
  CardData,
  CardType,
  Cluster,
  Connection,
  Rejection,
  TodoItem,
  Viewport,
  WorkspaceData,
} from '../types';

/**
 * Runtime validation for data that crosses a trust boundary:
 * snapshot links, restored backups and cloud pulls. Anything that is not
 * the shape we expect is dropped or coerced so a crafted payload cannot
 * crash the app or smuggle in `javascript:` links.
 */

const CARD_TYPES: readonly CardType[] = ['todo', 'note', 'sticky', 'counter', 'links'];
const CARD_COLORS: readonly CardColor[] = [
  'default', 'yellow', 'green', 'blue', 'purple', 'pink', 'amber', 'rose',
];
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const MAX_TEXT = 20_000;
const MAX_TITLE = 500;
const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
/** Id a shared space goes by in each person's workspace. */
const SHARED_DOC_ID = /^space-[0-9a-f-]{36}$/;

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = MAX_TITLE, fallback = ''): string =>
  typeof v === 'string' ? v.slice(0, max) : fallback;
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown): boolean => v === true;
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

/** Returns the URL if it uses an allowed protocol, otherwise an inert `#`. */
export function safeHref(url: unknown): string {
  if (typeof url !== 'string' || !url.trim()) return '#';
  try {
    const parsed = new URL(url.trim());
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : '#';
  } catch {
    return '#';
  }
}

/** Normalises user input for a bookmark: adds https:// when no scheme is given. */
export function normalizeBookmarkUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  const safe = safeHref(candidate);
  return safe === '#' ? '' : safe;
}

function sanitizeTodo(v: unknown, idx: number): TodoItem | null {
  if (!isDict(v)) return null;
  const priority = v.priority === 'low' || v.priority === 'medium' || v.priority === 'high'
    ? v.priority
    : undefined;
  return {
    id: str(v.id) || `t-${idx}`,
    text: str(v.text, MAX_TEXT),
    completed: bool(v.completed),
    ...(priority ? { priority } : {}),
    ...(typeof v.dueDate === 'string' ? { dueDate: str(v.dueDate, 64) } : {}),
  };
}

function sanitizeBookmark(v: unknown, idx: number): BookmarkItem | null {
  if (!isDict(v)) return null;
  const url = safeHref(v.url);
  if (url === '#') return null;
  return { id: str(v.id) || `b-${idx}`, title: str(v.title) || url, url };
}

function sanitizeRejection(v: unknown): Rejection | null {
  if (!isDict(v)) return null;
  const id = str(v.id, 64);
  const byId = str(v.byId, 64);
  if (!id || !byId) return null;
  const approvals = Array.isArray(v.approvals)
    ? [...new Set(v.approvals.filter((a): a is string => typeof a === 'string').map((a) => a.slice(0, 64)))].slice(0, 200)
    : [];
  return { id, byId, byEmail: str(v.byEmail, 320), at: num(v.at, Date.now()), approvals };
}

function sanitizeCard(v: unknown, idx: number): CardData | null {
  if (!isDict(v)) return null;
  const id = str(v.id);
  if (!id) return null;
  const card: CardData = {
    id,
    clusterId: typeof v.clusterId === 'string' ? v.clusterId : null,
    type: oneOf(v.type, CARD_TYPES, 'note'),
    title: str(v.title) || 'Untitled',
    x: num(v.x, 40 + idx * 20),
    y: num(v.y, 40 + idx * 20),
    color: oneOf(v.color, CARD_COLORS, 'default'),
    tags: Array.isArray(v.tags)
      ? v.tags.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 64))
      : [],
    createdAt: num(v.createdAt, Date.now()),
    updatedAt: num(v.updatedAt, Date.now()),
  };
  if (typeof v.width === 'number') card.width = num(v.width, 280);
  if (typeof v.height === 'number') card.height = num(v.height, 160);
  if (Array.isArray(v.todos)) {
    card.todos = v.todos.map(sanitizeTodo).filter((t): t is TodoItem => t !== null);
  }
  if (typeof v.noteContent === 'string') card.noteContent = str(v.noteContent, MAX_TEXT);
  if (typeof v.counterValue === 'number') card.counterValue = num(v.counterValue, 0);
  if (typeof v.counterLabel === 'string') card.counterLabel = str(v.counterLabel, 64);
  if (Array.isArray(v.bookmarks)) {
    card.bookmarks = v.bookmarks.map(sanitizeBookmark).filter((b): b is BookmarkItem => b !== null);
  }
  if (typeof v.link === 'string' && v.link) {
    const link = safeHref(v.link);
    if (link !== '#') card.link = link;
  }
  const rejection = sanitizeRejection(v.rejection);
  if (rejection) card.rejection = rejection;
  return card;
}

function sanitizeCluster(v: unknown): Cluster | null {
  if (!isDict(v)) return null;
  const id = str(v.id);
  if (!id) return null;
  return {
    id,
    title: str(v.title) || 'Cluster',
    color: oneOf(v.color, CARD_COLORS, 'blue'),
    x: num(v.x, 60),
    y: num(v.y, 60),
    width: Math.max(120, num(v.width, 380)),
    height: Math.max(120, num(v.height, 480)),
    ...(typeof v.collapsed === 'boolean' ? { collapsed: v.collapsed } : {}),
    ...(typeof v.icon === 'string' ? { icon: str(v.icon, 16) } : {}),
    createdAt: num(v.createdAt, Date.now()),
  };
}

function sanitizeConnection(v: unknown, knownIds: Set<string>): Connection | null {
  if (!isDict(v)) return null;
  const id = str(v.id);
  const fromId = str(v.fromId);
  const toId = str(v.toId);
  if (!id || !knownIds.has(fromId) || !knownIds.has(toId)) return null;
  return {
    id,
    fromId,
    toId,
    ...(typeof v.label === 'string' ? { label: str(v.label, 120) } : {}),
    ...(typeof v.color === 'string' && HEX_COLOR.test(v.color) ? { color: v.color } : {}),
  };
}

export function sanitizeDocument(input: unknown): BoardDocument | null {
  if (!isDict(input)) return null;
  const id = str(input.id);
  if (!id) return null;

  const clusters = Array.isArray(input.clusters)
    ? input.clusters.map(sanitizeCluster).filter((c): c is Cluster => c !== null)
    : [];
  const cards = Array.isArray(input.cards)
    ? input.cards.map(sanitizeCard).filter((c): c is CardData => c !== null)
    : [];
  const knownIds = new Set<string>([...clusters.map((c) => c.id), ...cards.map((c) => c.id)]);
  const connections = Array.isArray(input.connections)
    ? input.connections
        .map((c) => sanitizeConnection(c, knownIds))
        .filter((c): c is Connection => c !== null)
    : [];
  const vp = input.viewport;

  return {
    id,
    title: str(input.title) || 'Untitled Space',
    ...(typeof input.description === 'string' ? { description: str(input.description, 1000) } : {}),
    ...(input.protected === true ? { protected: true } : {}),
    icon: str(input.icon, 16) || '📝',
    color: typeof input.color === 'string' && HEX_COLOR.test(input.color) ? input.color : '#6366f1',
    createdAt: num(input.createdAt, Date.now()),
    updatedAt: num(input.updatedAt, Date.now()),
    clusters,
    cards,
    connections,
    viewport: sanitizeViewport(vp),
  };
}

function sanitizeViewport(v: unknown): Viewport {
  const vp = isDict(v) ? v : {};
  return {
    x: num(vp.x, 80),
    y: num(vp.y, 80),
    zoom: Math.min(2.5, Math.max(0.3, num(vp.zoom, 1))),
  };
}

/**
 * `allowEmpty` is for the account copy, which may hold no spaces of its own
 * when every space the person has is shared.
 */
export function sanitizeWorkspace(input: unknown, { allowEmpty = false } = {}): WorkspaceData | null {
  if (!isDict(input) || !Array.isArray(input.documents)) return null;
  const documents = input.documents
    .map(sanitizeDocument)
    .filter((d): d is BoardDocument => d !== null);
  if (documents.length === 0 && !allowEmpty) return null;
  const activeDocId =
    typeof input.activeDocId === 'string' &&
    (documents.some((d) => d.id === input.activeDocId) || (allowEmpty && SHARED_DOC_ID.test(input.activeDocId)))
      ? str(input.activeDocId)
      : (documents[0]?.id ?? '');
  const sharedViewports: Record<string, Viewport> = {};
  if (isDict(input.sharedViewports)) {
    for (const [id, vp] of Object.entries(input.sharedViewports).slice(0, 500)) {
      if (SHARED_DOC_ID.test(id)) sharedViewports[id] = sanitizeViewport(vp);
    }
  }
  return {
    version: num(input.version, 1),
    activeDocId,
    documents,
    theme: input.theme === 'light' || input.theme === 'system' ? input.theme : 'dark',
    ...(Object.keys(sharedViewports).length ? { sharedViewports } : {}),
  };
}
