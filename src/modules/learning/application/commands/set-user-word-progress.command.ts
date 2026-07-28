import { Command } from '@nestjs/cqrs';
import {
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../../domain/entities/user-word-progress';

export class SetUserWordProgressCommand extends Command<SetUserWordProgressStatusResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
    public readonly status: UserWordProgressStatus,
    /**
     * The client's calendar day, `yyyy-MM-dd`. Discovering a word advances
     * the streak, so this path needs the day for the same reason reviewing
     * does.
     */
    public readonly localDate: string,
  ) {
    super();
  }
}

export type SetUserWordProgressStatusResult = {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: UserWordProgressMasteryLevel;
  nextReviewAt: Date | null;
  updatedAt: Date;
};
