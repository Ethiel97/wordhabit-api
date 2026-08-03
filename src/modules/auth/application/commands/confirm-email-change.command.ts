import { Command } from '@nestjs/cqrs';

export type ConfirmEmailChangeResult = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

export class ConfirmEmailChangeCommand extends Command<ConfirmEmailChangeResult> {
  constructor(
    public readonly userId: string,
    public readonly code: string,
  ) {
    super();
  }
}
