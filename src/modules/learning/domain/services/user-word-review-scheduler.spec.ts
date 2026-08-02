import { computeWordReviewState } from './user-word-review-scheduler';
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
