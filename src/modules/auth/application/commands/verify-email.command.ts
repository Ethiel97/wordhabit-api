import { Command } from '@nestjs/cqrs';

export type VerifyEmailResult = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
};

export class VerifyEmailCommand extends Command<VerifyEmailResult> {
  constructor(
    public readonly userId: string,
    public readonly code: string,
  ) {
    super();
  }
}
