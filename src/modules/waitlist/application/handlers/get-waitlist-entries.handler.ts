import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetWaitlistEntriesQuery,
  GetWaitlistEntriesResult,
} from '../queries/get-waitlist-entries.query';
import type { WaitlistRepository } from '../../domain/repositories/waitlist.repository';
import { WAITLIST_REPOSITORY } from '../../domain/repositories/waitlist.repository';
import { Inject } from '@nestjs/common';

@QueryHandler(GetWaitlistEntriesQuery)
export class GetWaitlistEntriesHandler implements IQueryHandler<
  GetWaitlistEntriesQuery,
  GetWaitlistEntriesResult
> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly waitlistRepository: WaitlistRepository,
  ) {}

  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: GetWaitlistEntriesQuery,
  ): Promise<GetWaitlistEntriesResult> {
    return await this.waitlistRepository.findAll();
  }
}
