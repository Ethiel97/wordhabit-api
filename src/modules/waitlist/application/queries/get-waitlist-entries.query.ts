import { Query } from '@nestjs/cqrs';
import { GetWaitlistEntryResult } from './get-waitlist-entry.query';

export class GetWaitlistEntriesQuery extends Query<GetWaitlistEntriesResult> {
  constructor() {
    super();
  }
}

export type GetWaitlistEntriesResult = GetWaitlistEntryResult[];
