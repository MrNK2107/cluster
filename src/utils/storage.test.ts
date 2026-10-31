import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearLegacyLocalWorkspace, createStarterWorkspace, readLegacyLocalWorkspace } from './storage';
import { sanitizeWorkspace } from './validate';

const LEGACY_KEY = 'clustr_workspace_v1';

function openLegacyDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ClustrDB', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('workspace');
    req.onsuccess = () => {
      req.result.close();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

async function legacyDbExists(): Promise<boolean> {
  const dbs = await indexedDB.databases();
  return dbs.some((d) => d.name === 'ClustrDB');
}

beforeEach(() => {
  localStorage.clear();
});

describe('starter workspace', () => {
  it('is already in the shape the database hands back', () => {
    // Otherwise the first refetch after sign-up looks like a remote edit and
    // triggers a needless rewrite.
    const ws = createStarterWorkspace();
    expect(sanitizeWorkspace(JSON.parse(JSON.stringify(ws)))).toEqual(ws);
  });
});

describe('legacy browser-only workspace', () => {
  it('returns null when nothing was stored', () => {
    expect(readLegacyLocalWorkspace()).toBeNull();
  });

  it('reads and sanitizes the old local copy', () => {
    const ws = createStarterWorkspace();
    ws.documents[0].title = 'Kept from before accounts';
    localStorage.setItem(LEGACY_KEY, JSON.stringify(ws));
    expect(readLegacyLocalWorkspace()?.documents[0].title).toBe('Kept from before accounts');
  });

  it('ignores corrupt or hostile data instead of throwing', () => {
    localStorage.setItem(LEGACY_KEY, '{not json');
    expect(readLegacyLocalWorkspace()).toBeNull();
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ documents: [] }));
    expect(readLegacyLocalWorkspace()).toBeNull();
  });

  it('clears both the localStorage copy and the old Dexie database', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(createStarterWorkspace()));
    await openLegacyDb();
    expect(await legacyDbExists()).toBe(true);

    clearLegacyLocalWorkspace();

    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    await expect.poll(legacyDbExists).toBe(false);
  });
});
