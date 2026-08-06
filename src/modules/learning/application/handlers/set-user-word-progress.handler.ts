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
import { localDateToInstant } from '../../domain/services/local-date';
import { BadgeAwarderService } from '../services/badge-awarder.service';

@CommandHandler(SetUserWordProgressCommand)
export class SetUserWordProgressHandler implements ICommandHandler<
  SetUserWordProgressCommand,
  SetUserWordProgressStatusResult
> {
  private readonly logger = new Logger(SetUserWordProgressHandler.name);

  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
    private readonly badgeAwarder: BadgeAwarderService,
  ) {}

  async execute(
    command: SetUserWordProgressCommand,
  ): Promise<SetUserWordProgressStatusResult> {
    const { userId, wordId, status, localDate } = command;

    this.logger.log(
      `Setting user word progress for userId: ${userId}, wordId: ${wordId}, status: ${status}`,
    );

    // The client's day: the server's would schedule against the wrong
    // calendar.
    const date = localDateToInstant(localDate);

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

    // Only the first NEW→SEEN feeds the streak. Without it a new user
    // could never start one, since the review queue is empty on day one.
    // Everything else is excluded: SKIPPED is opting out, a repeated
    // SEEN is not a second discovery, and LEARNING/MASTERED come from
    // reviews, which keep the streak in their own handler.
    const isFirstDiscovery =
      status === UserWordProgressStatus.SEEN &&
      (!current || current.status === UserWordProgressStatus.NEW);

    if (isFirstDiscovery) {
      const currentStreak =
        await this.learningRepository.findUserLearningStreak(userId);

      const nextStreak = computeNextDailyStreak({
        current: currentStreak,
        activityLocalDate: command.localDate,
      });

      await this.learningRepository.upsertUserLearningStreak({
        userId,
        currentStreak: nextStreak.currentStreak,
        longestStreak: nextStreak.longestStreak,
        lastActivityLocalDate: nextStreak.lastActivityLocalDate,
      });
    }

    // A discovery grows the library and may reach into a new theme, so
    // it can unlock a collector badge even when no streak moved.
    await this.badgeAwarder.awardQuietly(userId);

    return {
      userId: updatedProgress.userId,
      wordId: updatedProgress.wordId,
      status: updatedProgress.status,
      masteryLevel: updatedProgress.masteryLevel,
      nextReviewOn: updatedProgress.nextReviewOn,
      updatedAt: updatedProgress.updatedAt,
    };
  }
}
