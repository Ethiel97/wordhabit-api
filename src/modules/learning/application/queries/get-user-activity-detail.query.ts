import { Query } from '@nestjs/cqrs';
import { UserActivityDetail } from '../../domain/repositories/learning.repository';

/** Words listed in a detail sheet before it starts sampling. */
export const USER_ACTIVITY_DETAIL_WORD_LIMIT = 8;

export class GetUserActivityDetailQuery extends Query<GetUserActivityDetailResult> {
  constructor(
    public readonly userId: string,
    /** Inclusive local day, `yyyy-MM-dd`. */
    public readonly from: string,
    /** Inclusive local day, `yyyy-MM-dd`. Equal to [from] for a single day. */
    public readonly to: string,
    public readonly limit = USER_ACTIVITY_DETAIL_WORD_LIMIT,
  ) {
    super();
  }
}

export type GetUserActivityDetailResult = UserActivityDetail & {
  from: string;
  to: string;
};
