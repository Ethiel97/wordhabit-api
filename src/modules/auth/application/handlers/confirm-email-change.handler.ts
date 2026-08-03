import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  ConfirmEmailChangeCommand,
  ConfirmEmailChangeResult,
} from '../commands/confirm-email-change.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import {
  EMAIL_CHANGE_REQUEST_REPOSITORY,
  type EmailChangeRequestRepository,
} from '../../domain/repositories/email-change-request.repository';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import { MAX_EMAIL_CHANGE_ATTEMPTS } from '../../domain/email-change.policy';
import { EmailAlreadyTakenError } from '../errors/auth-error';
import {
  EmailChangeCodeExpiredError,
  EmailChangeCodeInvalidError,
  NoPendingEmailChangeError,
  TooManyEmailChangeAttemptsError,
} from '../errors/email-change-errors';

/** Applies the change, once the new address has answered its code. */
@CommandHandler(ConfirmEmailChangeCommand)
export class ConfirmEmailChangeHandler implements ICommandHandler<
  ConfirmEmailChangeCommand,
  ConfirmEmailChangeResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(EMAIL_CHANGE_REQUEST_REPOSITORY)
    private readonly emailChangeRequestRepository: EmailChangeRequestRepository,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,
  ) {}

  async execute(
    command: ConfirmEmailChangeCommand,
  ): Promise<ConfirmEmailChangeResult> {
    const user = await this.authUserRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const request =
      await this.emailChangeRequestRepository.findLatestActiveByUserId(user.id);

    if (!request) {
      throw new NoPendingEmailChangeError({ userId: user.id });
    }

    // Counted before the comparison, so a wrong guess costs an attempt
    // whatever happens next.
    if (request.attempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
      throw new TooManyEmailChangeAttemptsError({ userId: user.id });
    }

    if (request.expiresAt < new Date()) {
      throw new EmailChangeCodeExpiredError({ userId: user.id });
    }

    const matches = await this.passwordService.verify(
      command.code,
      request.codeHash,
    );

    if (!matches) {
      await this.emailChangeRequestRepository.incrementAttempts(request.id);
      throw new EmailChangeCodeInvalidError({ userId: user.id });
    }

    // Checked again here, not only when the change was requested: the
    // address was free half an hour ago, and somebody may have signed
    // up with it since.
    const taken = await this.authUserRepository.findByEmail(request.newEmail);

    if (taken && taken.id !== user.id) {
      throw new EmailAlreadyTakenError({ userId: user.id });
    }

    const updated = await this.authUserRepository.changeEmail(
      user.id,
      request.newEmail,
    );

    await this.emailChangeRequestRepository.consume(request.id);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      emailVerified: updated.emailVerifiedAt !== null,
    };
  }
}
