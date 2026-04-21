import { Command } from '@nestjs/cqrs';

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
  status: 'PENDING' | 'INVITED' | 'REJECTED' | 'CONVERTED';
  createdAt: Date;
}
