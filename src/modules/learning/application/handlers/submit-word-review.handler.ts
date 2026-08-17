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
import { BadgeAwarderService } from '../services/badge-awarder.service';

@CommandHandler(SubmitWordReviewCommand)
export class SubmitWordReviewHandler implements ICommandHandler<
  SubmitWordReviewCommand,
  SubmitWordReviewResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
    private readonly badgeAwarder: BadgeAwarderService,
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
      localDate: command.localDate,
    });

    const updated = await this.learningRepository.updateUserWordReview({
      userId: command.userId,
      wordId: command.wordId,
      ...nextState,
    });

    // Append to the activity log before touching the streak: this is the
    // only durable record of *when* each review happened, since
    // `lastReviewedAt` above is overwritten every time.
    await this.learningRepository.recordWordReviewEvent({
      userId: command.userId,
      wordId: command.wordId,
      correct: command.correct,
      masteryBefore: currentUserWordProgress.masteryLevel,
      masteryAfter: nextState.masteryLevel,
      localDate: command.localDate,
    });

    const currentLearningStreak =
      await this.learningRepository.findUserLearningStreak(command.userId);

    const nextLearningStreak = computeNextDailyStreak({
      current: currentLearningStreak,
      activityLocalDate: command.localDate,
    });

    // Forwarded, not dropped: on a break the calculator reports what was
    // lost, and a repair has nothing to restore without it. Both are
    // undefined on every other path, which leaves any break the learner
    // may still repair untouched.
    await this.learningRepository.upsertUserLearningStreak({
      userId: command.userId,
      currentStreak: nextLearningStreak.currentStreak,
      longestStreak: nextLearningStreak.longestStreak,
      lastActivityLocalDate: nextLearningStreak.lastActivityLocalDate,
      brokenStreak: nextLearningStreak.brokenStreak,
      brokenOnLocalDate: nextLearningStreak.brokenOnLocalDate,
    });

    // Last, and never able to fail the review: the streak and the
    // mastery it just moved are two of the figures badges are won on.
    const newBadges = await this.badgeAwarder.awardQuietly(command.userId);

    return {
      userId: updated.userId,
      wordId: updated.wordId,
      status: updated.status,
      masteryLevel: updated.masteryLevel,
      reviewCount: updated.reviewCount,
      lastReviewedAt: updated.lastReviewedAt!,
      nextReviewOn: updated.nextReviewOn,
      updatedAt: updated.updatedAt,
      newBadges,
    };
  }
}
