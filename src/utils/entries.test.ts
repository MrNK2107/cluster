import { describe, expect, it } from 'vitest';
import type { CardData } from '../types';
import { dateUrgency, entryDate, entryLink, entryName, entryNotes, entrySteps, formatEntryDate } from './entries';
import { sanitizeDocument } from './validate';

const card = (extra: Partial<CardData>): CardData => ({
  id: 'c',
  type: 'todo',
  title: 'Entry',
  x: 0,
  y: 0,
  color: 'default',
  tags: [],
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

const NOW = new Date(Date.UTC(2026, 10, 2)); // Nov 2, 2026

describe('entries', () => {
  it('takes the date out of the title for the name', () => {
    expect(entryName(card({ title: '⏰ Nov 14 · Capture The Flag | Techkriti ’27' }))).toBe('Capture The Flag | Techkriti ’27');
    expect(entryName(card({ title: 'Plain name' }))).toBe('Plain name');
    expect(entryName(card({ title: 'Kotlin - the language' }))).toBe('Kotlin - the language');
  });

  it('dates an entry by its earliest open due step, else its title', () => {
    const withDue = card({
      title: '⏰ Dec 1 · X',
      todos: [
        { id: 'a', text: 'Register', completed: true, dueDate: '2026-11-05' },
        { id: 'b', text: 'Submit', completed: false, dueDate: '2026-11-20' },
      ],
    });
    expect(formatEntryDate(entryDate(withDue, NOW)!, NOW)).toBe('Nov 20');
    expect(formatEntryDate(entryDate(card({ title: '⏰ Nov 14 · X' }), NOW)!, NOW)).toBe('Nov 14');
    // Early next year rolls over instead of landing far in the past.
    expect(formatEntryDate(entryDate(card({ title: '⏰ Jan 5 · X' }), NOW)!, NOW)).toBe('Jan 5, 2027');
    expect(entryDate(card({ title: 'No date here' }), NOW)).toBeNull();
  });

  it('flags open entries that are past or due within a week', () => {
    const c = card({ title: '⏰ Nov 5 · X', todos: [{ id: 'a', text: 'Do', completed: false }] });
    expect(dateUrgency(c, entryDate(c, NOW), NOW)).toBe('soon');
    const past = card({ title: '⏰ Oct 20 · X', todos: [{ id: 'a', text: 'Do', completed: false }] });
    expect(dateUrgency(past, entryDate(past, NOW), NOW)).toBe('overdue');
    const finished = card({ title: '⏰ Oct 20 · X', todos: [{ id: 'a', text: 'Do', completed: true }] });
    expect(dateUrgency(finished, entryDate(finished, NOW), NOW)).toBeNull();
  });

  it('separates information lines from steps', () => {
    const c = card({
      todos: [
        { id: 't0', text: 'Register by Nov 14', completed: false },
        { id: 'info', text: 'ℹ️ Prize money · team 2-5', completed: false },
        { id: 'fit', text: '💡 Good fit for ML', completed: false },
      ],
    });
    expect(entrySteps(c).map((t) => t.id)).toEqual(['t0']);
    expect(entryNotes(c)).toEqual(['Prize money · team 2-5', 'Good fit for ML']);
  });

  it('uses the card link, or its only bookmark', () => {
    expect(entryLink(card({ link: 'https://a.test/' }))).toBe('https://a.test/');
    expect(entryLink(card({ bookmarks: [{ id: 'b', title: 'B', url: 'https://b.test/' }] }))).toBe('https://b.test/');
    expect(entryLink(card({}))).toBeNull();
  });

  it('keeps safe links and rejections when reading saved data, drops unsafe ones', () => {
    const doc = sanitizeDocument({
      id: 'd',
      cards: [
        { id: 'a', type: 'todo', link: 'https://ok.test/x', rejection: { id: 'r', byId: 'u1', byEmail: 'a@x', at: 1, approvals: ['u1', 'u1', 5] } },
        { id: 'b', type: 'todo', link: 'javascript:alert(1)' },
      ],
    })!;
    expect(doc.cards[0].link).toBe('https://ok.test/x');
    expect(doc.cards[0].rejection?.approvals).toEqual(['u1']);
    expect(doc.cards[1].link).toBeUndefined();
  });
});
