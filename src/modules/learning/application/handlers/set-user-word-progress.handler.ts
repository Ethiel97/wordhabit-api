import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  SetUserWordProgressCommand,
  SetUserWordProgressStatusResult,
} from '../commands/set-user-word-progress.command';
import { computeNextUserWordProgressState } from '../../domain/services/user-word-progress-state-machine';
import { computeNextDailyStreak } from '../../domain/services/daily-streak-calculator';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

@CommandHandler(SetUserWordProgressCommand)
export class SetUserWordProgressHandler implements ICommandHandler<
  SetUserWordProgressCommand,
  SetUserWordProgressStatusResult
> {
  private readonly logger = new Logger(SetUserWordProgressHandler.name);

  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    command: SetUserWordProgressCommand,
  ): Promise<SetUserWordProgressStatusResult> {
    const { userId, wordId, status } = command;

    this.logger.log(
      `Setting user word progress for userId: ${userId}, wordId: ${wordId}, status: ${status}`,
    );

    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const current = await this.learningRepository.findUserWordProgress({
      userId,
      wordId,
    });

    this.logger.log(
      `Current user word progress for userId: ${userId}, wordId: ${wordId}: ${JSON.stringify(
        current,
      )}`,
    );

    const nextState = computeNextUserWordProgressState({
      current,
      requestedStatus: status,
      now: date,
    });

    const updatedProgress =
      await this.learningRepository.setUserWordProgressStatus({
        userId,
        wordId,
        ...nextState,
      });

    // Discovering today's word is daily learning activity, so the
    // first NEW→SEEN transition feeds the streak — otherwise a brand
    // new user could never start one (the review queue is empty on
    // day one, and reviews were the only streak source).
    //
    // The guard keeps every other call out on purpose: SKIPPED is
    // opting out, not learning; idempotent SEEN re-sends are not a
    // second discovery; LEARNING/MASTERED are earned through reviews,
    // which maintain the streak in their own handler.
    const isFirstDiscovery =
      status === UserWordProgressStatus.SEEN &&
      (!current || current.status === UserWordProgressStatus.NEW);

    if (isFirstDiscovery) {
      const currentStreak =
        await this.learningRepository.findUserLearningStreak(userId);

      const nextStreak = computeNextDailyStreak({
        current: currentStreak,
        activityAt: date,
      });

      await this.learningRepository.upsertUserLearningStreak({
        userId,
        currentStreak: nextStreak.currentStreak,
        longestStreak: nextStreak.longestStreak,
        lastActivityDate: nextStreak.lastActivityDate,
      });
    }

    return {
      userId: updatedProgress.userId,
      wordId: updatedProgress.wordId,
      status: updatedProgress.status,
      masteryLevel: updatedProgress.masteryLevel,
      nextReviewAt: updatedProgress.nextReviewAt,
      updatedAt: updatedProgress.updatedAt,
    };
  }
}
