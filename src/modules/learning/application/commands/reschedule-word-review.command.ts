import { Command } from '@nestjs/cqrs';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

/**
 * The learner correcting when a word should come back, from its detail
 * screen — distinct from submitting a review, which is graded and earns
 * mastery.
 */
export class RescheduleWordReviewCommand extends Command<RescheduleWordReviewResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
    public readonly known: boolean,
    /** The client's calendar day, `yyyy-MM-dd`. */
    public readonly localDate: string,
  ) {
    super();
  }
}

export type RescheduleWordReviewResult = {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  nextReviewOn: string | null;
  updatedAt: Date;
};
