import { Query } from '@nestjs/cqrs';
import { BadgeStanding } from '../../domain/services/badge-catalog';

export class GetUserBadgesQuery extends Query<GetUserBadgesResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export type GetUserBadgesResult = {
  /** Every badge the app can draw, earned first. */
  badges: BadgeStanding[];
};
