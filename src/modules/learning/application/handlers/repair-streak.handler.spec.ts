import { RepairStreakHandler } from './repair-streak.handler';
import { RepairStreakCommand } from '../commands/repair-streak.command';
import { StreakRepairUnavailableError } from '../errors/streak-repair-unavailable.error';
import type { UserLearningStreak } from '../../domain/entities/user-learning-streak';

type Overrides = {
  isPro?: boolean;
  streak?: Partial<UserLearningStreak> | null;
  repairsThisMonth?: number;
  activityDays?: string[];
};

/** A 20-day chain that ended on the 14th and broke after. */
const brokenStreak = (
  overrides: Partial<UserLearningStreak> = {},
): UserLearningStreak => ({
  id: 'streak-1',
  userId: 'user-1',
  currentStreak: 1,
  longestStreak: 30,
  lastActivityLocalDate: '2026-08-14',
  brokenStreak: 20,
  brokenOnLocalDate: '2026-08-14',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const setup = (overrides: Overrides = {}) => {
  const streak =
    overrides.streak === null
      ? null
      : brokenStreak(overrides.streak ?? undefined);

  const upsert = jest.fn(async (params: Record<string, unknown>) => ({
    ...brokenStreak(),
    ...params,
  }));
  const record = jest.fn(async () => undefined);

  const progressRepository = {
    findUserLearningStreak: jest.fn(async () => streak),
    upsertUserLearningStreak: upsert,
    recordStreakRepairs: record,
    countStreakRepairsInMonth: jest.fn(
      async () => overrides.repairsThisMonth ?? 0,
    ),
    findUserDailyActivity: jest.fn(async () =>
      (overrides.activityDays ?? []).map((date) => ({
        date,
        reviewCount: 1,
        correctCount: 1,
      })),
    ),
    findStreakRepairs: jest.fn(async () => []),
    findUserActivityDetail: jest.fn(),
    findUserLearningStats: jest.fn(),
  };

  const subscriptionService = {
    isPro: jest.fn(async () => overrides.isPro ?? true),
  };

  const handler = new RepairStreakHandler(
    progressRepository as never,
    subscriptionService as never,
  );

  return { handler, progressRepository, subscriptionService, upsert, record };
};

const run = (handler: RepairStreakHandler, localDate = '2026-08-16') =>
  handler.execute(new RepairStreakCommand('user-1', localDate));

describe('RepairStreakHandler', () => {
  it('restores the chain, records the day and spends the quota', async () => {
    const { handler, upsert, record } = setup();

    const result = await run(handler);

    expect(result.currentStreak).toBe(21);
    expect(result.repairedLocalDates).toEqual(['2026-08-15']);
    expect(result.repairsLeftThisMonth).toBe(0);

    expect(record).toHaveBeenCalledWith({
      userId: 'user-1',
      repairedLocalDates: ['2026-08-15'],
    });
    // The break is cleared, or the same gap could be sold twice.
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStreak: 21,
        lastActivityLocalDate: '2026-08-15',
        brokenStreak: null,
        brokenOnLocalDate: null,
      }),
    );
  });

  it('records the days before rewriting the streak', async () => {
    // Order matters: a streak written without its repair rows leaves the
    // progress map showing a day it cannot explain, and the quota unspent.
    const { handler, upsert, record } = setup();
    const calls: string[] = [];
    record.mockImplementation(async () => {
      calls.push('record');
    });
    upsert.mockImplementation(async () => {
      calls.push('upsert');
      return brokenStreak();
    });

    await run(handler);

    expect(calls).toEqual(['record', 'upsert']);
  });

  it('tells a free learner they need Pro, before reading anything', async () => {
    const { handler, progressRepository } = setup({ isPro: false });

    await expect(run(handler)).rejects.toMatchObject({
      code: 'STREAK_REPAIR_NOT_PRO',
      reason: 'NOT_PRO',
    });
    expect(progressRepository.findUserLearningStreak).not.toHaveBeenCalled();
  });

  it('refuses once the month’s repair is spent', async () => {
    const { handler } = setup({ repairsThisMonth: 1 });

    await expect(run(handler)).rejects.toMatchObject({
      reason: 'ALREADY_REPAIRED_THIS_MONTH',
    });
  });

  it('refuses when the window has closed', async () => {
    const { handler } = setup();

    await expect(run(handler, '2026-08-18')).rejects.toBeInstanceOf(
      StreakRepairUnavailableError,
    );
  });

  it('never buys a day the learner actually practised', async () => {
    // They came back on the 16th but had missed the 15th. Only the 15th
    // is for sale; recording the 16th would make the map lie.
    const { handler, record } = setup({
      streak: { lastActivityLocalDate: '2026-08-16' },
      activityDays: ['2026-08-16', '2026-08-17'],
    });

    const result = await run(handler, '2026-08-17');

    expect(result.repairedLocalDates).toEqual(['2026-08-15']);
    expect(record).toHaveBeenCalledWith({
      userId: 'user-1',
      repairedLocalDates: ['2026-08-15'],
    });
  });

  it('refuses when no streak row exists at all', async () => {
    const { handler } = setup({ streak: null });

    await expect(run(handler)).rejects.toMatchObject({
      reason: 'NOTHING_TO_REPAIR',
    });
  });
});
