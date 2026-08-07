import { Command } from '@nestjs/cqrs';
import { QuizMode } from '../../domain/entities/quiz';
import { BadgeCode } from '../../domain/entities/badge';

export type SubmitQuizResultResult = {
  /** What this round paid, at XP_PER_QUIZ_ANSWER per correct answer. */
  earnedXp: number;
  /** True when every answer landed — the QUIZ_CHAMPION currency. */
  perfect: boolean;
  /** Badges this round just won, empty on every other call. */
  newBadges: BadgeCode[];
};

export class SubmitQuizResultCommand extends Command<SubmitQuizResultResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
    public readonly mode: QuizMode,
    public readonly correctCount: number,
    public readonly questionCount: number,
    /** The client's calendar day, `yyyy-MM-dd`. */
    public readonly localDate: string,
  ) {
    super();
  }
}
