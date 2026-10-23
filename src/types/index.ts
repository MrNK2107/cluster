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
  
  createdAt: number;
  updatedAt: number;
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
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface WorkspaceData {
  version: number;
  activeDocId: string;
  documents: BoardDocument[];
  theme: 'dark' | 'light' | 'system';
}
