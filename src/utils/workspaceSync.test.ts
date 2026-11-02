import { describe, expect, it } from 'vitest';
import type { BoardDocument, CardData, WorkspaceData } from '../types';
import { mergeDocs, mergeWorkspace, splitWorkspace } from './workspaceSync';

const card = (id: string, title: string, extra: Partial<CardData> = {}): CardData => ({
  id,
  type: 'note',
  title,
  x: 0,
  y: 0,
  color: 'default',
  tags: [],
  clusterId: null,
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

const doc = (id: string, cards: CardData[] = [], extra: Partial<BoardDocument> = {}): BoardDocument => ({
  id,
  title: id,
  icon: '📝',
  color: '#6366f1',
  createdAt: 1,
  updatedAt: 1,
  clusters: [],
  cards,
  connections: [],
  viewport: { x: 80, y: 80, zoom: 1 },
  ...extra,
});

const SPACE = '00000000-0000-4000-8000-000000000001';
const share = { spaceId: SPACE, ownerId: 'o', ownerEmail: 'o@x.test', isOwner: false };

describe('splitWorkspace / mergeWorkspace', () => {
  it('keeps shared spaces out of the account row but remembers where I was looking', () => {
    const ws: WorkspaceData = {
      version: 1,
      activeDocId: `space-${SPACE}`,
      theme: 'dark',
      documents: [doc('mine'), doc(`space-${SPACE}`, [card('c1', 'Shared')], { share, viewport: { x: 5, y: 6, zoom: 2 } })],
    };
    const { personal, shared } = splitWorkspace(ws);
    expect(personal.documents.map((d) => d.id)).toEqual(['mine']);
    expect(personal.sharedViewports).toEqual({ [`space-${SPACE}`]: { x: 5, y: 6, zoom: 2 } });
    const row = shared.get(SPACE)!;
    expect(row.share).toBeUndefined();
    expect(row.viewport).toEqual({ x: 80, y: 80, zoom: 1 });

    const back = mergeWorkspace(personal, [{ doc: row, share }]);
    expect(back.documents.map((d) => d.id)).toEqual(['mine', `space-${SPACE}`]);
    expect(back.documents[1].viewport).toEqual({ x: 5, y: 6, zoom: 2 });
    expect(back.documents[1].share).toEqual(share);
    expect(back.activeDocId).toBe(`space-${SPACE}`);
  });

  it('falls back to the first space when the open one is no longer shared with me', () => {
    const personal: WorkspaceData = { version: 1, activeDocId: `space-${SPACE}`, theme: 'dark', documents: [doc('mine')] };
    expect(mergeWorkspace(personal, []).activeDocId).toBe('mine');
  });
});

describe('mergeDocs', () => {
  const base = doc('d', [card('a', 'A'), card('b', 'B')]);

  it('keeps both people’s edits to different cards', () => {
    const mine = { ...base, cards: [card('a', 'A mine'), card('b', 'B')] };
    const theirs = { ...base, cards: [card('a', 'A'), card('b', 'B theirs')] };
    expect(mergeDocs(base, mine, theirs).cards.map((c) => c.title)).toEqual(['A mine', 'B theirs']);
  });

  it('keeps cards both people added', () => {
    const mine = { ...base, cards: [...base.cards, card('m', 'Mine')] };
    const theirs = { ...base, cards: [...base.cards, card('t', 'Theirs')] };
    expect(mergeDocs(base, mine, theirs).cards.map((c) => c.id)).toEqual(['a', 'b', 'm', 't']);
  });

  it('applies deletions unless the other person edited the card meanwhile', () => {
    const mine = { ...base, cards: [card('b', 'B')] }; // I deleted a
    const theirs = { ...base, cards: [card('a', 'A'), card('b', 'B edited')] };
    expect(mergeDocs(base, mine, theirs).cards.map((c) => c.title)).toEqual(['B edited']);

    const theirsEditedA = { ...base, cards: [card('a', 'A edited'), card('b', 'B')] };
    expect(mergeDocs(base, mine, theirsEditedA).cards.map((c) => c.title)).toEqual(['B', 'A edited']);
  });

  it('prefers my edit when both changed the same card', () => {
    const mine = { ...base, cards: [card('a', 'Mine'), card('b', 'B')] };
    const theirs = { ...base, cards: [card('a', 'Theirs'), card('b', 'B')] };
    expect(mergeDocs(base, mine, theirs).cards[0].title).toBe('Mine');
  });

  it('takes their rename when I did not rename', () => {
    const theirs = { ...base, title: 'Renamed' };
    expect(mergeDocs(base, base, theirs).title).toBe('Renamed');
  });

  it('drops connections whose ends were deleted', () => {
    const withConn = { ...base, connections: [{ id: 'x', fromId: 'a', toId: 'b' }] };
    const theirs = { ...withConn, cards: [card('a', 'A')] };
    expect(mergeDocs(withConn, withConn, theirs).connections).toEqual([]);
  });
});
