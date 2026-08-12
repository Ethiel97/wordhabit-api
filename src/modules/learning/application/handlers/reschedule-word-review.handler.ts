import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject } from '@nestjs/common';
import {
  RescheduleWordReviewCommand,
  RescheduleWordReviewResult,
} from '../commands/reschedule-word-review.command';
import type { WordProgressRepository } from '../../domain/repositories/learning.repository';
import { WORD_PROGRESS_REPOSITORY } from '../../domain/repositories/learning.repository';
import { computeWordRescheduleState } from '../../domain/services/user-word-review-scheduler';

/**
 * Writes the new due date and nothing else: no event, no streak, no
 * review count. Recording a correction as activity would let the heatmap
 * be filled by tapping.
 */
@CommandHandler(RescheduleWordReviewCommand)
export class RescheduleWordReviewHandler implements ICommandHandler<
  RescheduleWordReviewCommand,
  RescheduleWordReviewResult
> {
  constructor(
    @Inject(WORD_PROGRESS_REPOSITORY)
    private readonly wordProgressRepository: WordProgressRepository,
  ) {}

  async execute(
    command: RescheduleWordReviewCommand,
  ): Promise<RescheduleWordReviewResult> {
    const current = await this.wordProgressRepository.findUserWordProgress({
      userId: command.userId,
      wordId: command.wordId,
    });

    if (!current) {
      throw new BadRequestException(
        'Cannot reschedule a word without existing progress.',
      );
    }

    const nextState = computeWordRescheduleState({
      current,
      known: command.known,
      localDate: command.localDate,
    });

    const updated = await this.wordProgressRepository.rescheduleUserWordReview({
      userId: command.userId,
      wordId: command.wordId,
      ...nextState,
    });

    return {
      userId: updated.userId,
      wordId: updated.wordId,
      status: updated.status,
      masteryLevel: updated.masteryLevel,
      reviewCount: updated.reviewCount,
      lastReviewedAt: updated.lastReviewedAt,
      nextReviewOn: updated.nextReviewOn,
      updatedAt: updated.updatedAt,
    };
  }
}
