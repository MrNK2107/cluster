import { describe, expect, it } from 'vitest';
import { addDays, computeRota, isAccepted, newRota, toggleApproved, toggleAway, toggleDone, toggleVote } from './rota';
import { sanitizeDocument } from './validate';

const M = ['Aman', 'Paul', 'Nanda', 'Venkat'];
const who = (r: ReturnType<typeof newRota>, through: string) => computeRota(r, through).days.map((d) => d.person);

describe('chore rota', () => {
  it('goes round in order and repeats', () => {
    const r = newRota(M, '2026-11-01');
    expect(who(r, '2026-11-06')).toEqual(['Aman', 'Paul', 'Nanda', 'Venkat', 'Aman', 'Paul']);
  });

  it('lets the next person cover an absent one, who then pays back on return', () => {
    let r = newRota(M, '2026-11-01');
    r = toggleAway(r, '2026-11-02', 'Paul'); // Paul away on his day
    const s = computeRota(r, '2026-11-07');
    expect(s.days.map((d) => [d.person, d.reason])).toEqual([
      ['Aman', 'turn'],
      ['Nanda', 'cover'], // covers for Paul
      ['Paul', 'payback'], // Paul back, pays the day he owes
      ['Nanda', 'turn'], // order carries on from where it was
      ['Venkat', 'turn'],
      ['Aman', 'turn'],
      ['Paul', 'turn'],
    ]);
    expect(s.owed.Paul).toBe(0);
  });

  it('keeps the debt open while the person is still away', () => {
    let r = newRota(M, '2026-11-01');
    for (const d of ['2026-11-02', '2026-11-03', '2026-11-04']) r = toggleAway(r, d, 'Paul');
    const s = computeRota(r, '2026-11-04');
    expect(s.days.map((d) => d.person)).toEqual(['Aman', 'Nanda', 'Nanda', 'Venkat']);
    expect(s.owed.Paul).toBe(1);
  });

  it('evens out the number of days over time', () => {
    let r = newRota(M, '2026-11-01');
    r = toggleAway(r, '2026-11-02', 'Paul');
    r = toggleAway(r, '2026-11-06', 'Venkat');
    const s = computeRota(r, '2026-12-31');
    const counts = Object.values(s.counts);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('skips a day when everybody is away without creating debt', () => {
    let r = newRota(['A', 'B'], '2026-11-01');
    r = toggleAway(toggleAway(r, '2026-11-01', 'A'), '2026-11-01', 'B');
    const s = computeRota(r, '2026-11-02');
    expect(s.days[0].person).toBeNull();
    expect(s.owed).toEqual({ A: 0, B: 0 });
  });

  it('handles dates across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });

  describe('approving a cleaning', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const day = '2026-11-01';

    it('is not accepted until the cleaner says it was done', () => {
      const r = toggleVote(newRota(M, day), day, 'a');
      expect(isAccepted(r, day, ids)).toBe(false);
    });

    it('needs all four people to say yes', () => {
      let r = toggleDone(newRota(M, day), day);
      for (const id of ['a', 'b', 'c']) r = toggleVote(r, day, id);
      expect(isAccepted(r, day, ids)).toBe(false);
      r = toggleVote(r, day, 'd');
      expect(isAccepted(r, day, ids)).toBe(true);
    });

    it('lets the owner approve without the votes', () => {
      const r = toggleApproved(toggleDone(newRota(M, day), day), day);
      expect(isAccepted(r, day, ids)).toBe(true);
    });

    it('clears votes and approval when the cleaner takes it back', () => {
      let r = toggleApproved(toggleVote(toggleDone(newRota(M, day), day), day, 'a'), day);
      r = toggleDone(r, day);
      expect(r.votes[day]).toBeUndefined();
      expect(r.approved[day]).toBeUndefined();
    });

    it('is accepted once claimed when the space is not shared', () => {
      expect(isAccepted(toggleDone(newRota(M, day), day), day, [])).toBe(true);
    });
  });

  it('survives validation and drops junk', () => {
    let r = toggleVote(toggleAway(newRota(M, '2026-11-01'), '2026-11-02', 'Paul'), '2026-11-01', 'a');
    r = toggleApproved(r, '2026-11-01');
    const doc = sanitizeDocument({
      id: 'd',
      cards: [{ id: 'c', type: 'rota', rota: { ...r, away: { ...r.away, nonsense: ['Paul'], '2026-11-03': ['Nobody'] } } }],
    });
    expect(doc?.cards[0].rota).toEqual(r);
  });
});
