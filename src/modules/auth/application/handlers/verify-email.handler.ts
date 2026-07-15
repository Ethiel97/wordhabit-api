import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import {
  VerifyEmailCommand,
  VerifyEmailResult,
} from '../commands/verify-email.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import {
  EMAIL_VERIFICATION_CODE_REPOSITORY,
  type EmailVerificationCodeRepository,
} from '../../domain/repositories/email-verification-code.repository';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import { MAX_VERIFICATION_ATTEMPTS } from '../../domain/email-verification.policy';
import { EmailVerifiedEvent } from '../../domain/events/email-verified.event';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<
  VerifyEmailCommand,
  VerifyEmailResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(EMAIL_VERIFICATION_CODE_REPOSITORY)
    private readonly emailVerificationCodeRepository: EmailVerificationCodeRepository,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,

    private readonly eventBus: EventBus,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailResult> {
    const user = await this.authUserRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.emailVerifiedAt) {
      return this.toResult(user.id, user.email, user.name, true);
    }

    const verificationCode =
      await this.emailVerificationCodeRepository.findLatestActiveByUserId(
        user.id,
      );

    if (!verificationCode) {
      throw new BadRequestException(
        'No pending verification code. Request a new one.',
      );
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new BadRequestException(
        'Verification code has expired. Request a new one.',
      );
    }

    if (verificationCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new BadRequestException(
        'Too many failed attempts. Request a new code.',
      );
    }

    await this.emailVerificationCodeRepository.incrementAttempts(
      verificationCode.id,
    );

    const codeMatches = await this.passwordService.verify(
      command.code,
      verificationCode.codeHash,
    );

    if (!codeMatches) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.emailVerificationCodeRepository.markConsumed(
      verificationCode.id,
    );

    const verifiedUser = await this.authUserRepository.markEmailVerified(
      user.id,
    );

    this.eventBus.publish(
      new EmailVerifiedEvent(
        verifiedUser.id,
        verifiedUser.email,
        verifiedUser.name,
      ),
    );

    return this.toResult(
      verifiedUser.id,
      verifiedUser.email,
      verifiedUser.name,
      true,
    );
  }

  private toResult(
    id: string,
    email: string,
    name: string,
    emailVerified: boolean,
  ): VerifyEmailResult {
    return { user: { id, email, name, emailVerified } };
  }
}
