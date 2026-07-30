import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DeleteAccountCommand,
  DeleteAccountResult,
} from '../commands/delete-account.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import { Inject, NotFoundException } from '@nestjs/common';
import { purgeAtFor } from '../../domain/account-deletion.policy';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<
  DeleteAccountCommand,
  DeleteAccountResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<DeleteAccountResult> {
    const { userId, reason } = command;

    const user = await this.authUserRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Already scheduled: answer with the existing schedule rather than
    // failing. The user asked for deletion and deletion is what they
    // have, so a retried request — flaky network, double tap — must not
    // become an error, and must not restart the 30-day clock. (The JWT
    // guard normally rejects a deleted account before it gets here;
    // this is the belt to that brace.)
    const deletedAt =
      user.deletedAt ??
      (await this.authUserRepository.softDelete({ userId, reason }))
        .deletedAt ??
      new Date();

    return { deactivatedAt: deletedAt, purgeAt: purgeAtFor(deletedAt) };
  }
}
