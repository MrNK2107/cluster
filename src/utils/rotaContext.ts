import { createContext } from 'react';

/** Who is looking at the rota and who has a say in it; set by the app around the open space. */
export interface RotaPeople {
  myId: string;
  /** Everyone with access to the space; empty when it isn't shared. */
  people: { userId: string; email: string }[];
  isOwner: boolean;
}

export const RotaPeopleContext = createContext<RotaPeople | null>(null);
