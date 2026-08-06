import { Command } from '@nestjs/cqrs';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';
import { BadgeCode } from '../../domain/entities/badge';

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
  nextReviewOn: string | null;
  updatedAt: Date;
  /**
   * Badges this review just won, empty on every other call.
   *
   * Returned rather than pushed: recognition lands while the user is
   * still on the screen that earned it, so the client celebrates in the
   * session summary instead of interrupting with a notification.
   */
  newBadges: BadgeCode[];
};
