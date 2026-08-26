import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  RepairStreakCommand,
  RepairStreakResult,
} from '../commands/repair-streak.command';
import type { LearnerProgressRepository } from '../../domain/repositories/learning.repository';
import { LEARNER_PROGRESS_REPOSITORY } from '../../domain/repositories/learning.repository';
import { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import {
  applyStreakRepair,
  assessStreakRepair,
  STREAK_REPAIR_WINDOW_DAYS,
  STREAK_REPAIRS_PER_MONTH,
} from '../../domain/services/streak-repair';
import { shiftLocalDate } from '../../domain/services/local-date';
import { StreakRepairUnavailableError } from '../errors/streak-repair-unavailable.error';

@CommandHandler(RepairStreakCommand)
export class RepairStreakHandler implements ICommandHandler<
  RepairStreakCommand,
  RepairStreakResult
> {
  constructor(
    @Inject(LEARNER_PROGRESS_REPOSITORY)
    private readonly progressRepository: LearnerProgressRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async execute(command: RepairStreakCommand): Promise<RepairStreakResult> {
    const { userId, localDate } = command;

    // Checked first: a free learner should be told they need Pro, not
    // that their streak happens to be unrepairable today.
    const isPro = await this.subscriptionService.isPro(userId);
    if (!isPro) {
      throw new StreakRepairUnavailableError(
        'NOT_PRO',
        'Streak repair is a WordHabit Pro feature.',
      );
    }

    const streak = await this.progressRepository.findUserLearningStreak(userId);
    if (!streak) {
      throw new StreakRepairUnavailableError('NOTHING_TO_REPAIR');
    }

    const monthPrefix = localDate.slice(0, 7);
    const spentThisMonth =
      await this.progressRepository.countStreakRepairsInMonth({
        userId,
        monthPrefix,
      });

    // The days with real activity in the window, read rather than
    // assumed: a day the learner practised must never be recorded as
    // bought, or the progress map lies about their history.
    const practisedLocalDates = await this.findPractisedDays({
      userId,
      brokenOnLocalDate: streak.brokenOnLocalDate,
      localDate,
    });

    const assessment = assessStreakRepair({
      streak: {
        brokenStreak: streak.brokenStreak,
        brokenOnLocalDate: streak.brokenOnLocalDate,
        lastActivityLocalDate: streak.lastActivityLocalDate,
      },
      practisedLocalDates,
      todayLocalDate: localDate,
      repairedThisMonth: spentThisMonth >= STREAK_REPAIRS_PER_MONTH,
    });

    if (!assessment.repairable) {
      throw new StreakRepairUnavailableError(assessment.reason);
    }

    const repaired = applyStreakRepair({ streak, assessment });

    // Days first: if the streak write succeeded and this one failed, the
    // quota would go unspent and the progress map would show a day it
    // cannot explain.
    await this.progressRepository.recordStreakRepairs({
      userId,
      repairedLocalDates: assessment.missedLocalDates,
    });

    const updated = await this.progressRepository.upsertUserLearningStreak({
      userId,
      currentStreak: repaired.currentStreak,
      longestStreak: repaired.longestStreak,
      lastActivityLocalDate: repaired.lastActivityLocalDate,
      brokenStreak: repaired.brokenStreak,
      brokenOnLocalDate: repaired.brokenOnLocalDate,
    });

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      lastActivityLocalDate: updated.lastActivityLocalDate!,
      repairedLocalDates: assessment.missedLocalDates,
      repairsLeftThisMonth: Math.max(
        0,
        STREAK_REPAIRS_PER_MONTH - (spentThisMonth + 1),
      ),
    };
  }

  /**
   * Activity days between the break and today, inclusive.
   *
   * Reuses the heatmap's own query: it already returns one row per day
   * that has reviews, sparse, which is exactly the set the assessment
   * needs. No new index, no new table scan.
   */
  private async findPractisedDays({
    userId,
    brokenOnLocalDate,
    localDate,
  }: {
    userId: string;
    brokenOnLocalDate: string | null;
    localDate: string;
  }): Promise<string[]> {
    if (!brokenOnLocalDate) return [];

    // Bounded by the window rather than by the break alone: a very old
    // break would otherwise scan an unbounded range for days the
    // assessment is going to refuse anyway.
    const windowStart = shiftLocalDate(
      localDate,
      -(STREAK_REPAIR_WINDOW_DAYS + 1),
    );
    const from =
      brokenOnLocalDate > windowStart ? brokenOnLocalDate : windowStart;

    const activity = await this.progressRepository.findUserDailyActivity({
      userId,
      from,
      to: localDate,
    });

    return activity.map((day) => day.date);
  }
}
