import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { LearnerBadgeRepository } from '../../domain/repositories/learning.repository';
import { LEARNER_BADGE_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  GetUserBadgesQuery,
  GetUserBadgesResult,
} from '../queries/get-user-badges.query';
import { badgeStandings } from '../../domain/services/badge-catalog';
import { BadgeAwarderService } from '../services/badge-awarder.service';

@QueryHandler(GetUserBadgesQuery)
export class GetUserBadgesHandler implements IQueryHandler<
  GetUserBadgesQuery,
  GetUserBadgesResult
> {
  constructor(
    @Inject(LEARNER_BADGE_REPOSITORY)
    private readonly badgeRepository: LearnerBadgeRepository,
    private readonly badgeAwarder: BadgeAwarderService,
  ) {}

  async execute(query: GetUserBadgesQuery): Promise<GetUserBadgesResult> {
    const snapshot = await this.badgeAwarder.readSnapshot(query.userId);

    // A read that writes, deliberately. Awarding otherwise only happens
    // on the write paths, so anything that became true in between — a
    // rule whose target moved, an account that already qualified before
    // badges existed, a write whose evaluation failed — would show here
    // as a locked tile with a full bar. Idempotent, and it inserts
    // nothing at all on the ordinary visit.
    await this.badgeAwarder.awardQuietly(query.userId, snapshot);

    // After awarding, so a badge won a moment ago carries its date.
    const earned = await this.badgeRepository.findUserBadges(query.userId);

    return { badges: badgeStandings({ earned, snapshot }) };
  }
}
