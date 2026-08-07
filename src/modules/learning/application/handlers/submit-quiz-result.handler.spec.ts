import { BadRequestException } from '@nestjs/common';
import { SubmitQuizResultHandler } from './submit-quiz-result.handler';
import { SubmitQuizResultCommand } from '../commands/submit-quiz-result.command';
import { QuizMode } from '../../domain/entities/quiz';
import { BadgeCode } from '../../domain/entities/badge';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import type { BadgeAwarderService } from '../services/badge-awarder.service';
import { XP_PER_QUIZ_ANSWER } from '../../domain/services/xp-scale';

class FakeRepository implements Partial<QuizRepository> {
  created: unknown[] = [];

  createQuizResult = (params: unknown) => {
    this.created.push(params);
    return Promise.resolve();
  };
}

const handlerFor = (repository: FakeRepository, newBadges: BadgeCode[] = []) =>
  new SubmitQuizResultHandler(
    repository as unknown as QuizRepository,
    {
      awardQuietly: () => Promise.resolve(newBadges),
    } as unknown as BadgeAwarderService,
  );

const command = (correct: number, total: number) =>
  new SubmitQuizResultCommand(
    'u1',
    'w1',
    QuizMode.MASTERY,
    correct,
    total,
    '2026-08-07',
  );

describe('SubmitQuizResultHandler', () => {
  it('records the round and pays the published rate', async () => {
    const repository = new FakeRepository();
    const result = await handlerFor(repository).execute(command(4, 5));

    expect(repository.created).toHaveLength(1);
    expect(result.earnedXp).toBe(4 * XP_PER_QUIZ_ANSWER);
    expect(result.perfect).toBe(false);
  });

  it('reports a perfect round, the QUIZ_CHAMPION currency', async () => {
    const result = await handlerFor(new FakeRepository(), [
      BadgeCode.QUIZ_CHAMPION,
    ]).execute(command(5, 5));

    expect(result.perfect).toBe(true);
    expect(result.newBadges).toEqual([BadgeCode.QUIZ_CHAMPION]);
  });

  it('refuses an impossible score before anything is written', async () => {
    // Client-reported, same trust model as flashcards — but 6/5 is a
    // forgery or a bug, and either way it must not enter the XP log.
    const repository = new FakeRepository();

    await expect(
      handlerFor(repository).execute(command(6, 5)),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      handlerFor(repository).execute(command(-1, 5)),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.created).toHaveLength(0);
  });
});
