import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomInt } from 'node:crypto';
import { addMinutes } from 'date-fns';
import {
  RequestEmailChangeCommand,
  RequestEmailChangeResult,
} from '../commands/request-email-change.command';
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
import {
  AUTH_EMAIL_QUEUE,
  SEND_EMAIL_CHANGE_CODE_JOB,
  SEND_EMAIL_CHANGE_NOTICE_JOB,
  SendEmailChangeCodeJobData,
  SendEmailChangeNoticeJobData,
} from '../../infrastructure/queue/auth-email-queue.constants';
import { EMAIL_CHANGE_CODE_TTL_MINUTES } from '../../domain/email-change.policy';
import { VERIFICATION_CODE_LENGTH } from '../../domain/email-verification.policy';
import { EmailAlreadyTakenError } from '../errors/auth-error';
import { EmailUnchangedError } from '../errors/email-change-errors';
import { PasswordMismatchError } from '../errors/password-errors';

/**
 * Starts an email change; changes nothing yet.
 *
 * Two messages go out. The code goes to the address being claimed —
 * that is what proves it is reachable, and reachable by this person.
 * A notice goes to the address being left, because it is the only
 * moment a hijacked account can still warn its owner.
 */
@CommandHandler(RequestEmailChangeCommand)
export class RequestEmailChangeHandler implements ICommandHandler<
  RequestEmailChangeCommand,
  RequestEmailChangeResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(EMAIL_CHANGE_REQUEST_REPOSITORY)
    private readonly emailChangeRequestRepository: EmailChangeRequestRepository,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,

    @InjectQueue(AUTH_EMAIL_QUEUE)
    private readonly authEmailQueue: Queue,
  ) {}

  async execute(
    command: RequestEmailChangeCommand,
  ): Promise<RequestEmailChangeResult> {
    const user = await this.authUserRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Re-authentication, not authorisation: the session already proves
    // who they are. This proves they are still at the keyboard, which
    // is what stops a borrowed phone from moving the account.
    if (
      !user.password ||
      !(await this.passwordService.verify(
        command.currentPassword,
        user.password,
      ))
    ) {
      throw new PasswordMismatchError({ userId: user.id });
    }

    const newEmail = command.newEmail.trim().toLowerCase();

    if (newEmail === user.email.toLowerCase()) {
      throw new EmailUnchangedError({ userId: user.id });
    }

    // Checked again at confirmation: between the two, someone else may
    // register it.
    if (await this.authUserRepository.findByEmail(newEmail)) {
      throw new EmailAlreadyTakenError({ userId: user.id });
    }

    const code = this.generateCode();
    const expiresAt = addMinutes(new Date(), EMAIL_CHANGE_CODE_TTL_MINUTES);

    // A pending code for an address the user has thought better of must
    // not survive the new request.
    await this.emailChangeRequestRepository.invalidateAllForUser(user.id);

    await this.emailChangeRequestRepository.create({
      userId: user.id,
      newEmail,
      codeHash: await this.passwordService.hash(code),
      expiresAt,
    });

    const codePayload: SendEmailChangeCodeJobData = {
      email: newEmail,
      name: user.name,
      code,
    };

    const noticePayload: SendEmailChangeNoticeJobData = {
      email: user.email,
      name: user.name,
      newEmail,
    };

    await this.authEmailQueue.add(SEND_EMAIL_CHANGE_CODE_JOB, codePayload, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    await this.authEmailQueue.add(SEND_EMAIL_CHANGE_NOTICE_JOB, noticePayload, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return { pendingEmail: newEmail, expiresAt };
  }

  private generateCode(): string {
    const max = 10 ** VERIFICATION_CODE_LENGTH;
    return randomInt(0, max).toString().padStart(VERIFICATION_CODE_LENGTH, '0');
  }
}
