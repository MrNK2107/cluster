import Dexie, { type Table } from 'dexie';
import type { WorkspaceData } from '../types';
import { INITIAL_DOCUMENTS } from './storage';

export interface StoredWorkspace {
  id: string; // 'current_workspace'
  data: WorkspaceData;
  updatedAt: number;
}

export class ClustrDatabase extends Dexie {
  workspaces!: Table<StoredWorkspace, string>;

  constructor() {
    super('ClustrDB');
    this.version(1).stores({
      workspaces: 'id, updatedAt',
    });
  }
}

export const db = new ClustrDatabase();

const LOCAL_STORAGE_KEY = 'clustr_workspace_v1';
const DB_DOC_ID = 'main_workspace';

export async function loadWorkspaceFromDB(): Promise<WorkspaceData> {
  try {
    // 1. Try to load from IndexedDB
    const record = await db.workspaces.get(DB_DOC_ID);
    if (record && record.data && Array.isArray(record.data.documents) && record.data.documents.length > 0) {
      return record.data;
    }

    // 2. Fallback: Check if user has data in localStorage to migrate
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && Array.isArray(parsed.documents) && parsed.documents.length > 0) {
        await saveWorkspaceToDB(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load from IndexedDB, falling back to localStorage', err);
  }

  // 3. Fallback to default starter data
  const initial: WorkspaceData = {
    version: 1,
    activeDocId: INITIAL_DOCUMENTS[0].id,
    documents: INITIAL_DOCUMENTS,
    theme: 'dark',
  };
  await saveWorkspaceToDB(initial);
  return initial;
}

export async function saveWorkspaceToDB(data: WorkspaceData): Promise<void> {
  try {
    // Save to IndexedDB (unlimited storage, persistent)
    await db.workspaces.put({
      id: DB_DOC_ID,
      data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error saving to IndexedDB', err);
  }

  // Also maintain localStorage as a fast sync cache
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // If localStorage quota exceeded, IndexedDB still keeps everything safe!
  }
}
