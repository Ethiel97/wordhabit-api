import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject } from '@nestjs/common';
import {
  SubmitWordReviewCommand,
  SubmitWordReviewResult,
} from '../commands/submit-word-review.command';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { computeWordReviewState } from '../../domain/services/user-word-review-scheduler';
import { computeNextDailyStreak } from '../../domain/services/daily-streak-calculator';

@CommandHandler(SubmitWordReviewCommand)
export class SubmitWordReviewHandler implements ICommandHandler<
  SubmitWordReviewCommand,
  SubmitWordReviewResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    command: SubmitWordReviewCommand,
  ): Promise<SubmitWordReviewResult> {
    const currentUserWordProgress =
      await this.learningRepository.findUserWordProgress({
        userId: command.userId,
        wordId: command.wordId,
      });

    if (!currentUserWordProgress) {
      throw new BadRequestException(
        'Cannot review a word without existing progress.',
      );
    }

    const now = new Date();

    const nextState = computeWordReviewState({
      current: currentUserWordProgress,
      correct: command.correct,
      now,
    });

    const updated = await this.learningRepository.updateUserWordReview({
      userId: command.userId,
      wordId: command.wordId,
      ...nextState,
    });

    const currentLearningStreak =
      await this.learningRepository.findUserLearningStreak(command.userId);

    const nextLearningStreak = computeNextDailyStreak({
      current: currentLearningStreak,
      activityAt: now,
    });

    await this.learningRepository.upsertUserLearningStreak({
      userId: command.userId,
      currentStreak: nextLearningStreak.currentStreak,
      longestStreak: nextLearningStreak.longestStreak,
      lastActivityDate: nextLearningStreak.lastActivityDate,
    });

    return {
      userId: updated.userId,
      wordId: updated.wordId,
      status: updated.status,
      masteryLevel: updated.masteryLevel,
      reviewCount: updated.reviewCount,
      lastReviewedAt: updated.lastReviewedAt!,
      nextReviewAt: updated.nextReviewAt,
      updatedAt: updated.updatedAt,
    };
  }
}
