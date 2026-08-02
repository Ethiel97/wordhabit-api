import { Query } from '@nestjs/cqrs';
import { ReviewQueueItem } from '../../domain/repositories/learning.repository';

export const REVIEW_QUEUE_LIMIT = 20;

export class GetReviewQueueQuery extends Query<GetReviewQueueResult> {
  constructor(
    public readonly userId: string,
    /** The caller's own day, `yyyy-MM-dd`. */
    public readonly localDate: string,
    public readonly limit: number = REVIEW_QUEUE_LIMIT,
  ) {
    super();
  }
}

export interface GetReviewQueueResult {
  items: ReviewQueueItem[];
}
