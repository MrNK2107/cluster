export type CardType = 'todo' | 'note' | 'sticky' | 'counter' | 'links';

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
  /** Everyone with access, owner first. */
  people: SpacePerson[];
}

export interface SpacePerson {
  userId: string;
  email: string;
}

export interface WorkspaceData {
  version: number;
  activeDocId: string;
  documents: BoardDocument[];
  theme: 'dark' | 'light' | 'system';
  /** Each person's own canvas position in spaces shared with them, by space document id. */
  sharedViewports?: Record<string, Viewport>;
}
