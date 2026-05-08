import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { WaitlistRepository } from '../../domain/repositories/waitlist.repository';
import { WAITLIST_REPOSITORY } from '../../domain/repositories/waitlist.repository';
import {
  GetWaitlistCountQuery,
  GetWaitlistCountResult,
} from '../queries/get-waitlist-count.query';

@QueryHandler(GetWaitlistCountQuery)
export class GetWaitlistCountHandler implements IQueryHandler<
  GetWaitlistCountQuery,
  GetWaitlistCountResult
> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepository: WaitlistRepository,
  ) {}

  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: GetWaitlistCountQuery,
  ): Promise<GetWaitlistCountResult> {
    const count = await this.waitlistRepository.count();

    return { count };
  }
}
