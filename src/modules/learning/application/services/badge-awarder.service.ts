import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LearnerBadgeRepository } from '../../domain/repositories/learning.repository';
import { LEARNER_BADGE_REPOSITORY } from '../../domain/repositories/learning.repository';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import { QUIZ_REPOSITORY } from '../../domain/repositories/quiz.repository';
import { BadgeCode } from '../../domain/entities/badge';
import {
  BadgeSnapshot,
  earnedBadgeCodes,
} from '../../domain/services/badge-catalog';

/**
 * Awards whatever the learner has just become eligible for.
 *
 * Called after every write that could unlock something rather than on a
 * schedule: a badge that arrives hours after the streak it celebrates
 * has lost the moment it was for.
 *
 * Safe to call as often as that. It reads the current standing, offers
 * every code it satisfies, and the unique index decides what is new — so
 * the tenth call of the day inserts nothing and returns an empty list.
 */
@Injectable()
export class BadgeAwarderService {
  private readonly logger = new Logger(BadgeAwarderService.name);

  constructor(
    @Inject(LEARNER_BADGE_REPOSITORY)
    private readonly badgeRepository: LearnerBadgeRepository,

    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,
  ) {}

  /**
   * The full standing badges are judged on.
   *
   * Composed here because the snapshot now spans two repositories — the
   * learning figures and the quiz's perfect modes. This service owns
   * the evaluation, so it owns the assembly; a repository injecting
   * another repository would be the layering running backwards.
   */
  async readSnapshot(userId: string): Promise<BadgeSnapshot> {
    const [figures, quizPerfectModes] = await Promise.all([
      this.badgeRepository.findBadgeSnapshot(userId),
      this.quizRepository.countPerfectQuizModes({ userId }),
    ]);
    return { ...figures, quizPerfectModes };
  }

  /**
   * The codes this call won.
   *
   * [snapshot] lets a caller that has already read the learner's
   * standing hand it over instead of paying for it twice.
   */
  async award(userId: string, snapshot?: BadgeSnapshot): Promise<BadgeCode[]> {
    const standing = snapshot ?? (await this.readSnapshot(userId));
    const eligible = earnedBadgeCodes(standing);

    const awarded = await this.badgeRepository.awardBadges({
      userId,
      codes: eligible,
    });

    if (awarded.length > 0) {
      this.logger.log('Badges awarded', { userId, awarded });
    }

    return awarded;
  }

  /**
   * Never lets a badge failure take down the write it followed.
   *
   * Recognition is not the transaction: a review that succeeded must
   * stay succeeded even if the snapshot query times out, and the next
   * write re-evaluates from scratch anyway.
   */
  async awardQuietly(
    userId: string,
    snapshot?: BadgeSnapshot,
  ): Promise<BadgeCode[]> {
    try {
      return await this.award(userId, snapshot);
    } catch (error: unknown) {
      this.logger.error('Badge evaluation failed', { userId, error });
      return [];
    }
  }
}
