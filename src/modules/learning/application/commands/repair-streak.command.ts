import { Command } from '@nestjs/cqrs';

/**
 * A Pro learner spending their monthly repair to stitch a broken chain
 * back together.
 *
 * [localDate] is the client's own calendar day, like every other command
 * here: the server's date names a different day far from its timezone,
 * and the window a repair is allowed in is measured in the learner's
 * calendar, not the server's.
 */
export class RepairStreakCommand extends Command<RepairStreakResult> {
  constructor(
    public readonly userId: string,
    /** `yyyy-MM-dd`. */
    public readonly localDate: string,
  ) {
    super();
  }
}

export type RepairStreakResult = {
  currentStreak: number;
  longestStreak: number;
  /** `yyyy-MM-dd`. */
  lastActivityLocalDate: string;
  /** The days this repair filled, in order. */
  repairedLocalDates: string[];
  /** Repairs left this calendar month, after this one. */
  repairsLeftThisMonth: number;
};
