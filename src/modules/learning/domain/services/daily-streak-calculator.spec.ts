import { computeNextDailyStreak } from './daily-streak-calculator';

const snapshot = (
  currentStreak: number,
  longestStreak: number,
  day: string,
) => ({
  currentStreak,
  longestStreak,
  lastActivityLocalDate: day,
});

describe('computeNextDailyStreak', () => {
  it('starts at one for a user with no history', () => {
    const next = computeNextDailyStreak({
      current: null,
      activityLocalDate: '2026-07-27',
    });

    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.lastActivityLocalDate).toBe('2026-07-27');
  });

  it('extends the streak on the following day', () => {
    const next = computeNextDailyStreak({
      current: snapshot(4, 9, '2026-07-26'),
      activityLocalDate: '2026-07-27',
    });

    expect(next.currentStreak).toBe(5);
    // Still short of the record, so the record stands.
    expect(next.longestStreak).toBe(9);
  });

  it('raises the record once the streak passes it', () => {
    const next = computeNextDailyStreak({
      current: snapshot(9, 9, '2026-07-26'),
      activityLocalDate: '2026-07-27',
    });

    expect(next.currentStreak).toBe(10);
    expect(next.longestStreak).toBe(10);
  });

  it('does not count a second activity on the same day', () => {
    // The bug this design fixes: deriving the day from an instant made an
    // evening review in a UTC-5 zone look like the next day, so two
    // sessions in one evening inflated the streak.
    const next = computeNextDailyStreak({
      current: snapshot(3, 7, '2026-07-27'),
      activityLocalDate: '2026-07-27',
    });

    expect(next.currentStreak).toBe(3);
    expect(next.longestStreak).toBe(7);
  });

  it('restarts after a missed day, keeping the record', () => {
    const next = computeNextDailyStreak({
      current: snapshot(12, 12, '2026-07-24'),
      activityLocalDate: '2026-07-27',
    });

    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(12);
  });

  it('counts across a month boundary', () => {
    const next = computeNextDailyStreak({
      current: snapshot(2, 2, '2026-07-31'),
      activityLocalDate: '2026-08-01',
    });

    expect(next.currentStreak).toBe(3);
  });

  it('counts across a DST transition like any other day', () => {
    // 2026-11-01 is when most of North America leaves DST. As calendar
    // days these are simply consecutive; the old instant-based maths had
    // to reason about a 25-hour day.
    const next = computeNextDailyStreak({
      current: snapshot(5, 5, '2026-10-31'),
      activityLocalDate: '2026-11-01',
    });

    expect(next.currentStreak).toBe(6);
  });

  it('restarts rather than decrements if the day moves backwards', () => {
    // A device clock rolled back should never corrupt the record.
    const next = computeNextDailyStreak({
      current: snapshot(6, 8, '2026-07-27'),
      activityLocalDate: '2026-07-25',
    });

    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(8);
  });
});
