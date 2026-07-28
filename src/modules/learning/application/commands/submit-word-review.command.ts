import { Command } from '@nestjs/cqrs';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

export class SubmitWordReviewCommand extends Command<SubmitWordReviewResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
    public readonly correct: boolean,
    /** The client's calendar day, `yyyy-MM-dd`. */
    public readonly localDate: string,
  ) {
    super();
  }
}

export type SubmitWordReviewResult = {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date;
  nextReviewAt: Date | null;
  updatedAt: Date;
};
