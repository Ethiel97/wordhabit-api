import {
  computeWordRescheduleState,
  computeWordReviewState,
} from './user-word-review-scheduler';
import {
  UserWordProgress,
  UserWordProgressStatus,
} from '../entities/user-word-progress';

const progress = (overrides: Partial<UserWordProgress> = {}) => ({
  id: 'p1',
  userId: 'u1',
  wordId: 'w1',
  status: UserWordProgressStatus.LEARNING,
  masteryLevel: 0,
  reviewCount: 0,
  seenAt: null,
  lastReviewedAt: null,
  nextReviewOn: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('computeWordReviewState', () => {
  it('counts the interval from the learner day, not the clock', () => {
    // Answered at 23:50 — a clock-based interval would come back at
    // 23:50 the next day, past the moment the learner opens the app.
    const state = computeWordReviewState({
      current: progress(),
      correct: true,
      now: new Date('2026-07-31T23:50:00Z'),
      localDate: '2026-07-31',
    });

    expect(state.nextReviewOn).toBe('2026-08-01');
  });

  it('lengthens the interval with mastery', () => {
    const state = computeWordReviewState({
      current: progress({ masteryLevel: 45 }),
      correct: true,
      now: new Date('2026-07-31T10:00:00Z'),
      localDate: '2026-07-31',
    });

    // 45 + 15 = 60 → seven days.
    expect(state.nextReviewOn).toBe('2026-08-07');
  });

  it('brings a missed word back the next day without docking mastery', () => {
    const state = computeWordReviewState({
      current: progress({ masteryLevel: 60 }),
      correct: false,
      now: new Date('2026-07-31T10:00:00Z'),
      localDate: '2026-07-31',
    });

    expect(state.nextReviewOn).toBe('2026-08-01');
    expect(state.masteryLevel).toBe(60);
  });

  it('crosses a month boundary', () => {
    const state = computeWordReviewState({
      current: progress({ masteryLevel: 0 }),
      correct: true,
      now: new Date('2026-08-31T10:00:00Z'),
      localDate: '2026-08-31',
    });

    expect(state.nextReviewOn).toBe('2026-09-01');
  });

  it('stops scheduling once mastered', () => {
    const state = computeWordReviewState({
      current: progress({ masteryLevel: 90 }),
      correct: true,
      now: new Date('2026-07-31T10:00:00Z'),
      localDate: '2026-07-31',
    });

    expect(state.status).toBe(UserWordProgressStatus.MASTERED);
    expect(state.nextReviewOn).toBeNull();
  });
});

describe('computeWordRescheduleState', () => {
  it('buys delay without granting mastery', () => {
    // The detail screen shows the definition, so "I know this" is a
    // claim, not a recall: the interval moves as if the next tier had
    // been earned, the stored mastery does not.
    const state = computeWordRescheduleState({
      current: progress({ masteryLevel: 45 }),
      known: true,
      localDate: '2026-07-31',
    });

    expect(state.masteryLevel).toBe(45);
    expect(state.nextReviewOn).toBe('2026-08-07');
  });

  it('cannot be tapped to mastery', () => {
    // Ten claims in a row leave the learner exactly where they started.
    let current = progress({ masteryLevel: 45 });

    for (let i = 0; i < 10; i++) {
      const state = computeWordRescheduleState({
        current,
        known: true,
        localDate: '2026-07-31',
      });
      current = progress({ ...current, ...state });
    }

    expect(current.masteryLevel).toBe(45);
    expect(current.status).toBe(UserWordProgressStatus.LEARNING);
  });

  it('brings a hard word back tomorrow', () => {
    const state = computeWordRescheduleState({
      current: progress({ masteryLevel: 60 }),
      known: false,
      localDate: '2026-07-31',
    });

    expect(state.nextReviewOn).toBe('2026-08-01');
    expect(state.masteryLevel).toBe(60);
  });

  it('demotes a mastered word that slipped, so it has a due date again', () => {
    const state = computeWordRescheduleState({
      current: progress({
        masteryLevel: 100,
        status: UserWordProgressStatus.MASTERED,
      }),
      known: false,
      localDate: '2026-07-31',
    });

    expect(state.status).toBe(UserWordProgressStatus.LEARNING);
    expect(state.masteryLevel).toBe(85);
    expect(state.nextReviewOn).toBe('2026-08-01');
  });

  it('leaves a mastered word alone when the learner still knows it', () => {
    const state = computeWordRescheduleState({
      current: progress({
        masteryLevel: 100,
        status: UserWordProgressStatus.MASTERED,
      }),
      known: true,
      localDate: '2026-07-31',
    });

    expect(state.status).toBe(UserWordProgressStatus.MASTERED);
    expect(state.masteryLevel).toBe(100);
    expect(state.nextReviewOn).toBeNull();
  });
});
