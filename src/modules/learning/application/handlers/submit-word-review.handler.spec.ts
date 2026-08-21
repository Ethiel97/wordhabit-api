import { SubmitWordReviewHandler } from './submit-word-review.handler';
import { SubmitWordReviewCommand } from '../commands/submit-word-review.command';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

/**
 * Guards the seam a break has to cross to reach storage.
 *
 * The calculator reporting a break is worth nothing if the handler drops
 * it on the way to the repository: `brokenOnLocalDate` would stay null
 * forever, every repair would be refused as NOTHING_TO_REPAIR, and the
 * feature would be silently dead while every other test still passed.
 */
const progress = {
  userId: 'user-1',
  wordId: 'word-1',
  status: UserWordProgressStatus.LEARNING,
  masteryLevel: 40,
  reviewCount: 3,
  lastReviewedAt: new Date('2026-08-14T10:00:00.000Z'),
  nextReviewOn: '2026-08-16',
  seenAt: new Date('2026-08-01T10:00:00.000Z'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const setup = (
  streak: Record<string, unknown> | null,
  { existingProgress = true }: { existingProgress?: boolean } = {},
) => {
  const upsertUserLearningStreak = jest.fn((params: unknown) => params);
  const setUserWordProgressStatus = jest.fn(() => Promise.resolve(progress));

  const learningRepository = {
    findUserWordProgress: jest.fn(() => (existingProgress ? progress : null)),
    setUserWordProgressStatus,
    updateUserWordReview: jest.fn(() => progress),
    recordWordReviewEvent: jest.fn(() => undefined),
    findUserLearningStreak: jest.fn(() => streak),
    upsertUserLearningStreak,
  };

  const badgeAwarder = { awardQuietly: jest.fn(() => []) };

  const handler = new SubmitWordReviewHandler(
    learningRepository as never,
    badgeAwarder as never,
  );

  return { handler, upsertUserLearningStreak, setUserWordProgressStatus };
};

const review = (localDate: string) =>
  new SubmitWordReviewCommand('user-1', 'word-1', true, localDate);

describe('SubmitWordReviewHandler and the streak break', () => {
  it('persists what a gap cost, so a repair has something to restore', async () => {
    // Active on the 14th, back on the 17th: two days missing.
    const { handler, upsertUserLearningStreak } = setup({
      id: 'streak-1',
      userId: 'user-1',
      currentStreak: 20,
      longestStreak: 30,
      lastActivityLocalDate: '2026-08-14',
      brokenStreak: null,
      brokenOnLocalDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(review('2026-08-17'));

    expect(upsertUserLearningStreak).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStreak: 1,
        brokenStreak: 20,
        brokenOnLocalDate: '2026-08-14',
      }),
    );
  });

  it('leaves a pending break alone when the chain simply continues', async () => {
    // Undefined rather than null: writing null here would erase a break
    // the learner is still inside the window to repair, so practising
    // would quietly cancel their repair.
    const { handler, upsertUserLearningStreak } = setup({
      id: 'streak-1',
      userId: 'user-1',
      currentStreak: 4,
      longestStreak: 30,
      lastActivityLocalDate: '2026-08-16',
      brokenStreak: 20,
      brokenOnLocalDate: '2026-08-14',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(review('2026-08-17'));

    const params = upsertUserLearningStreak.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params.currentStreak).toBe(5);
    expect(params.brokenStreak).toBeUndefined();
    expect(params.brokenOnLocalDate).toBeUndefined();
  });
});

describe('SubmitWordReviewHandler and a word never opened', () => {
  it('creates the progress instead of refusing the review', async () => {
    // The dashboard offers yesterday's recall whether the word
    // was ever opened, so this path has to answer.
    const { handler, setUserWordProgressStatus } = setup(null, {
      existingProgress: false,
    });

    await expect(handler.execute(review('2026-08-20'))).resolves.toBeDefined();
    expect(setUserWordProgressStatus).toHaveBeenCalledTimes(1);
  });
});
