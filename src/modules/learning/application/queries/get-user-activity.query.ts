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
     * The caller's own today, `yyyy-MM-dd`. Supplied rather than derived:
     * only the client knows which calendar day it is for the user, and
     * saying so outright removes every timezone calculation from the
     * server.
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
   * Days that saw at least one review, oldest first — sparse. The client
   * already generates the calendar it renders, so it maps these onto that
   * list rather than the server padding a year of zeroes.
   */
  days: UserDailyActivity[];
};
