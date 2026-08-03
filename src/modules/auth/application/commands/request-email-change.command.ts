import { Command } from '@nestjs/cqrs';

export type RequestEmailChangeResult = {
  /** Echoed so the client can show where the code went. */
  pendingEmail: string;
  expiresAt: Date;
};

export class RequestEmailChangeCommand extends Command<RequestEmailChangeResult> {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
    public readonly currentPassword: string,
  ) {
    super();
  }
}
