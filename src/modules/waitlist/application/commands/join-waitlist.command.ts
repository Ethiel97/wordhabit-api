import { Command } from '@nestjs/cqrs';
import { WaitlistStatus } from '../../domain/entities/wailist-entry';

export class JoinWaitlistCommand extends Command<JoinWaitlistResult> {
  constructor(
    public readonly email: string,
    public readonly source?: string,
  ) {
    super();
  }
}

export interface JoinWaitlistResult {
  id: string;
  email: string;
  source: string | null;
  status: WaitlistStatus;
  createdAt: Date;
}
