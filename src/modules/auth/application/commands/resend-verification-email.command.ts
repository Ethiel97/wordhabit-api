import { Command } from '@nestjs/cqrs';

export type ResendVerificationEmailResult = {
  sent: boolean;
};

export class ResendVerificationEmailCommand extends Command<ResendVerificationEmailResult> {
  constructor(public readonly userId: string) {
    super();
  }
}
