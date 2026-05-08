import { Query } from '@nestjs/cqrs';
import { WaitlistStatus } from '../../domain/entities/wailist-entry';

export class GetWaitlistEntryQuery extends Query<GetWaitlistEntryResult> {
  constructor(public readonly email: string) {
    super();
  }
}

export type GetWaitlistEntryResult = {
  id: string;
  email: string;
  source: string | null;
  status: WaitlistStatus;
  createdAt?: Date;
  updatedAt?: Date;
} | null;
