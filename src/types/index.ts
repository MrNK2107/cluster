export type CardType = 'todo' | 'note' | 'sticky' | 'counter' | 'links' | 'rota';

export type CardColor = 
  | 'default'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'amber'
  | 'rose';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

/** A daily chore rota; the schedule itself is worked out from this (see utils/rota.ts). */
export interface RotaData {
  /** In turn order. */
  members: string[];
  /** The first day of the rota (YYYY-MM-DD); the first member takes it. */
  startDate: string;
  /** Who is away on a day, by YYYY-MM-DD. */
  away: Record<string, string[]>;
  /** Days the cleaner says it was cleaned, by YYYY-MM-DD. */
  done: Record<string, true>;
  /** User ids of the people who said yes to a day's cleaning, by YYYY-MM-DD. */
  votes: Record<string, string[]>;
  /** Days the owner approved straight away, by YYYY-MM-DD. */
  approved: Record<string, true>;
}

export interface CardData {
  id: string;
  clusterId?: string | null; // null if floating free on canvas
  type: CardType;
  title: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: CardColor;
  tags: string[];
  
  // Type-specific content
  todos?: TodoItem[];
  noteContent?: string;
  counterValue?: number;
  counterLabel?: string;
  bookmarks?: BookmarkItem[];
  rota?: RotaData;

  /** The page this entry is about (registration, job post, docs…). */
  link?: string;
  /** In a shared space, a proposal to delete this card that everyone must agree to. */
  rejection?: Rejection;

  createdAt: number;
  updatedAt: number;
}

export interface Rejection {
  id: string;
  byId: string;
  byEmail: string;
  at: number;
  /** User ids of everyone who agreed, the proposer included. */
  approvals: string[];
}

export interface Cluster {
  id: string;
  title: string;
  color: CardColor;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean;
  icon?: string;
  createdAt: number;
}

export interface Connection {
  id: string;
  fromId: string; // cardId or clusterId
  toId: string;
  label?: string;
  color?: string;
}

export interface BoardDocument {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  clusters: Cluster[];
  cards: CardData[];
  connections: Connection[];
  viewport: Viewport;
  /**
   * Nobody can delete this space, not even its owner (the database refuses
   * too). People can still leave it, and the owner can still add or remove
   * people. Only turned off by hand in the database.
   */
  protected?: boolean;
  /** Set when the space is shared between accounts; never saved inside the space itself. */
  share?: ShareInfo;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ShareInfo {
  spaceId: string;
  ownerId: string;
  ownerEmail: string;
  isOwner: boolean;
  /** False when this person was added as view only; missing means they can edit. */
  canEdit?: boolean;
  /** Everyone with access, owner first. */
  people: SpacePerson[];
}

export type SpaceRole = 'edit' | 'view';

export interface SpacePerson {
  userId: string;
  email: string;
  /** What they may do; missing means edit. The owner always can. */
  role?: SpaceRole;
}

export interface WorkspaceData {
  version: number;
  activeDocId: string;
  documents: BoardDocument[];
  theme: 'dark' | 'light' | 'system';
  /** Each person's own canvas position in spaces shared with them, by space document id. */
  sharedViewports?: Record<string, Viewport>;
}
