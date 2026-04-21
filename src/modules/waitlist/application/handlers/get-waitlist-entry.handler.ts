import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetWaitlistEntryQuery,
  GetWaitlistEntryResult,
} from '../queries/get-waitlist-entry.query';
import type { WaitlistRepository } from '../../domain/repositories/waitlist.repository';
import { WAITLIST_REPOSITORY } from '../../domain/repositories/waitlist.repository';

import { Inject, NotFoundException } from '@nestjs/common';

@QueryHandler(GetWaitlistEntryQuery)
export class GetWaitlistEntryHandler implements IQueryHandler<
  GetWaitlistEntryQuery,
  GetWaitlistEntryResult
> {
  constructor(
    @Inject(WAITLIST_REPOSITORY)
    private readonly repository: WaitlistRepository,
  ) {}

  async execute(query: GetWaitlistEntryQuery): Promise<GetWaitlistEntryResult> {
    const entry = await this.repository.findByEmail(query.email);

    if (!entry) {
      throw new NotFoundException(
        `No email found in the waitlist for ${query.email}`,
      );
    }

    return {
      id: entry.id,
      email: entry.email,
      source: entry.source,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
