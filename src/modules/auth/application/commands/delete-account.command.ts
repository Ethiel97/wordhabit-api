import { Command } from '@nestjs/cqrs';
import { AccountDeletionReason } from '../../domain/entities/account-deletion-reason';

/**
 * The deletion schedule — the only thing the client needs back. It shows
 * the erasure date and tells the user they can still log in to cancel.
 *
 * The reason is not echoed: the client just sent it, and it exists to be
 * aggregated, not read back.
 */
export type DeleteAccountResult = {
  deactivatedAt: Date;
  purgeAt: Date;
};

export class DeleteAccountCommand extends Command<DeleteAccountResult> {
  constructor(
    readonly userId: string,
    readonly reason?: AccountDeletionReason,
  ) {
    super();
  }
}
