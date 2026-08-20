import { GetLearnerXpHandler } from './get-learner-xp.handler';
import { GetLearnerXpQuery } from '../queries/get-learner-xp.query';
import type {
  LearnerBadgeRepository,
  WordProgressRepository,
} from '../../domain/repositories/learning.repository';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import {
  XP_PER_BADGE,
  XP_PER_DAILY_JOURNEY,
  XP_PER_QUIZ_ANSWER,
} from '../../domain/services/xp-scale';

type Sources = {
  quizDays?: string[];
  masteryDays?: string[];
  badgeDays?: string[];
  correctAnswers?: number;
};

const handlerFor = (sources: Sources) =>
  new GetLearnerXpHandler(
    {
      countCorrectReviews: () => Promise.resolve(0),
      findMasteryJourneyDays: () => Promise.resolve(sources.masteryDays ?? []),
    } as unknown as WordProgressRepository,
    {
      countCorrectQuizAnswers: () =>
        Promise.resolve(sources.correctAnswers ?? 0),
      findQuizDays: () => Promise.resolve(sources.quizDays ?? []),
    } as unknown as QuizRepository,
    {
      findUserBadges: () =>
        Promise.resolve(
          (sources.badgeDays ?? []).map((day) => ({
            code: 'FIRST_WORD',
            earnedAt: new Date(`${day}T12:00:00.000Z`),
          })),
        ),
    } as unknown as LearnerBadgeRepository,
  );

const query = new GetLearnerXpQuery('user-1', '2026-08-17');

describe('GetLearnerXpHandler', () => {
  it('pays every day a journey ended, however it ended', async () => {
    const result = await handlerFor({
      quizDays: ['2026-08-15'],
      masteryDays: ['2026-08-16'],
    }).execute(query);

    expect(result.xp).toBe(2 * XP_PER_DAILY_JOURNEY);
  });

  it('pays a day once when both routes closed it', async () => {
    // The learner mastered the word and then took the quiz: one day,
    // one journey.
    const result = await handlerFor({
      quizDays: ['2026-08-16'],
      masteryDays: ['2026-08-16'],
    }).execute(query);

    expect(result.xp).toBe(XP_PER_DAILY_JOURNEY);
  });

  it('pays badges lifetime, whatever the window', async () => {
    const result = await handlerFor({
      badgeDays: ['2026-01-04', '2026-08-16'],
    }).execute(query);

    expect(result.xp).toBe(2 * XP_PER_BADGE);
  });

  it('keeps the pace on the last seven days only', async () => {
    // 2026-08-09 is one day outside a window that opens on the 11th.
    const result = await handlerFor({
      quizDays: ['2026-08-09', '2026-08-16'],
      badgeDays: ['2026-08-09'],
      correctAnswers: 3,
    }).execute(query);

    expect(result.xp).toBe(
      2 * XP_PER_DAILY_JOURNEY + XP_PER_BADGE + 3 * XP_PER_QUIZ_ANSWER,
    );
    expect(result.dailyXp).toBe(
      Math.round((XP_PER_DAILY_JOURNEY + 3 * XP_PER_QUIZ_ANSWER) / 7),
    );
  });
});
