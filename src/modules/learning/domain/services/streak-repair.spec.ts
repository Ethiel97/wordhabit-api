import { applyStreakRepair, assessStreakRepair } from './streak-repair';
import type { BrokenStreakSnapshot } from './streak-repair';

/** A 20-day chain that ended on the 14th. */
const broken = (
  overrides: Partial<BrokenStreakSnapshot> = {},
): BrokenStreakSnapshot => ({
  brokenStreak: 20,
  brokenOnLocalDate: '2026-08-14',
  lastActivityLocalDate: '2026-08-14',
  ...overrides,
});

const assess = (params: {
  streak?: BrokenStreakSnapshot;
  practised?: string[];
  today: string;
  repairedThisMonth?: boolean;
}) =>
  assessStreakRepair({
    streak: params.streak ?? broken(),
    practisedLocalDates: params.practised ?? [],
    todayLocalDate: params.today,
    repairedThisMonth: params.repairedThisMonth ?? false,
  });

describe('assessStreakRepair', () => {
  it('fills yesterday when only yesterday is missing', () => {
    const result = assess({ today: '2026-08-16' });

    expect(result).toEqual({
      repairable: true,
      missedLocalDates: ['2026-08-15'],
      lastCountedLocalDate: '2026-08-15',
      // 20 through the 14th, plus the 15th filled.
      restoredStreak: 21,
    });
  });

  it('still repairs on the third day, filling both missed days', () => {
    // The whole point of a three-day window: a learner who only opens the
    // app on the 17th has not lost the chain yet.
    const result = assess({ today: '2026-08-17' });

    expect(result).toEqual({
      repairable: true,
      missedLocalDates: ['2026-08-15', '2026-08-16'],
      lastCountedLocalDate: '2026-08-16',
      restoredStreak: 22,
    });
  });

  it('repairs after today has already been practised', () => {
    // The calculator has restarted the chain at 1, which is exactly why
    // the break is stored apart. Today counts, so it is not a hole.
    const result = assess({
      streak: broken({ lastActivityLocalDate: '2026-08-17' }),
      practised: ['2026-08-17'],
      today: '2026-08-17',
    });

    expect(result).toEqual({
      repairable: true,
      missedLocalDates: ['2026-08-15', '2026-08-16'],
      lastCountedLocalDate: '2026-08-17',
      // 20, plus two filled days, plus today practised.
      restoredStreak: 23,
    });
  });

  it('never marks a day the learner actually practised', () => {
    // They came back on the 16th but had missed the 15th, so only the
    // 15th was bought.
    const result = assess({
      streak: broken({ lastActivityLocalDate: '2026-08-16' }),
      practised: ['2026-08-16', '2026-08-17'],
      today: '2026-08-17',
    });

    expect(result).toEqual({
      repairable: true,
      missedLocalDates: ['2026-08-15'],
      lastCountedLocalDate: '2026-08-17',
      restoredStreak: 23,
    });
  });

  it('closes the window on the fourth day', () => {
    const result = assess({ today: '2026-08-18' });

    expect(result).toEqual({ repairable: false, reason: 'WINDOW_CLOSED' });
  });

  it('refuses while the chain is still intact', () => {
    const result = assess({ today: '2026-08-15' });

    expect(result).toEqual({ repairable: false, reason: 'NOTHING_TO_REPAIR' });
  });

  it('refuses a device clock that moved backwards', () => {
    const result = assess({ today: '2026-08-10' });

    expect(result).toEqual({ repairable: false, reason: 'NOTHING_TO_REPAIR' });
  });

  it('refuses when no break is pending', () => {
    const result = assess({
      streak: broken({ brokenStreak: null, brokenOnLocalDate: null }),
      today: '2026-08-16',
    });

    expect(result).toEqual({ repairable: false, reason: 'NOTHING_TO_REPAIR' });
  });

  it('refuses when every day in the gap turns out to be practised', () => {
    const result = assess({
      practised: ['2026-08-15'],
      today: '2026-08-16',
    });

    expect(result).toEqual({ repairable: false, reason: 'NOTHING_TO_REPAIR' });
  });

  it('refuses a second repair in the same calendar month', () => {
    const result = assess({ today: '2026-08-16', repairedThisMonth: true });

    expect(result).toEqual({
      repairable: false,
      reason: 'ALREADY_REPAIRED_THIS_MONTH',
    });
  });

  it('finds the missed days across a month boundary', () => {
    const result = assess({
      streak: broken({
        brokenOnLocalDate: '2026-07-30',
        lastActivityLocalDate: '2026-07-30',
      }),
      today: '2026-08-01',
    });

    expect(result).toEqual({
      repairable: true,
      missedLocalDates: ['2026-07-31'],
      lastCountedLocalDate: '2026-07-31',
      restoredStreak: 21,
    });
  });
});

describe('applyStreakRepair', () => {
  it('restores the chain and clears the break', () => {
    const assessment = assess({ today: '2026-08-17' });
    if (!assessment.repairable) throw new Error('expected repairable');

    const repaired = applyStreakRepair({
      streak: { longestStreak: 30 },
      assessment,
    });

    expect(repaired.currentStreak).toBe(22);
    expect(repaired.lastActivityLocalDate).toBe('2026-08-16');
    expect(repaired.brokenStreak).toBeNull();
    expect(repaired.brokenOnLocalDate).toBeNull();
    // Short of the record, so the record stands.
    expect(repaired.longestStreak).toBe(30);
  });

  it('lets a restored chain set a new record', () => {
    // Deliberate: capping the record would read as a counting bug to
    // someone who just paid to keep their streak. The repaired days are
    // marked in the progress map instead.
    const assessment = assess({ today: '2026-08-16' });
    if (!assessment.repairable) throw new Error('expected repairable');

    const repaired = applyStreakRepair({
      streak: { longestStreak: 20 },
      assessment,
    });

    expect(repaired.currentStreak).toBe(21);
    expect(repaired.longestStreak).toBe(21);
  });

  it('keeps today as the last activity when today was practised', () => {
    const assessment = assess({
      streak: broken({ lastActivityLocalDate: '2026-08-17' }),
      practised: ['2026-08-17'],
      today: '2026-08-17',
    });
    if (!assessment.repairable) throw new Error('expected repairable');

    const repaired = applyStreakRepair({
      streak: { longestStreak: 30 },
      assessment,
    });

    // Not the last filled day: today is later, and rolling back to the
    // 16th would let today be counted a second time tomorrow.
    expect(repaired.lastActivityLocalDate).toBe('2026-08-17');
    expect(repaired.currentStreak).toBe(23);
  });
});
