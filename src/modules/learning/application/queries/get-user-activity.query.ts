import { Query } from '@nestjs/cqrs';
import { UserDailyActivity } from '../../domain/repositories/learning.repository';

/** Five weeks — the progress screen's heatmap. */
export const USER_ACTIVITY_DEFAULT_DAYS = 35;

/** A little over a year, so the yearly chart fits in one request. */
export const USER_ACTIVITY_MAX_DAYS = 366;

export class GetUserActivityQuery extends Query<GetUserActivityResult> {
  constructor(
    public readonly userId: string,
    /**
     * The caller's own today, `yyyy-MM-dd`. Supplied rather than
     * derived: only the client knows the user's calendar day.
     */
    public readonly to: string,
    public readonly days = USER_ACTIVITY_DEFAULT_DAYS,
  ) {
    super();
  }
}

export type GetUserActivityResult = {
  /** First local day covered, `yyyy-MM-dd`. */
  from: string;
  /** Last local day covered (the caller's today), `yyyy-MM-dd`. */
  to: string;
  totalReviews: number;
  /**
   * Days with at least one review, oldest first, sparse: the client maps
   * them onto the calendar it already generates.
   */
  days: UserDailyActivity[];
};
