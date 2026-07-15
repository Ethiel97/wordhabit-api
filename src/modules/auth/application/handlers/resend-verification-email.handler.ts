import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { differenceInSeconds } from 'date-fns';
import {
  ResendVerificationEmailCommand,
  ResendVerificationEmailResult,
} from '../commands/resend-verification-email.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import {
  EMAIL_VERIFICATION_CODE_REPOSITORY,
  type EmailVerificationCodeRepository,
} from '../../domain/repositories/email-verification-code.repository';
import { EmailVerificationService } from '../services/email-verification.service';
import { RESEND_COOLDOWN_SECONDS } from '../../domain/email-verification.policy';

@CommandHandler(ResendVerificationEmailCommand)
export class ResendVerificationEmailHandler implements ICommandHandler<
  ResendVerificationEmailCommand,
  ResendVerificationEmailResult
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,

    @Inject(EMAIL_VERIFICATION_CODE_REPOSITORY)
    private readonly emailVerificationCodeRepository: EmailVerificationCodeRepository,

    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async execute(
    command: ResendVerificationEmailCommand,
  ): Promise<ResendVerificationEmailResult> {
    const user = await this.authUserRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.emailVerifiedAt) {
      throw new ConflictException('Email is already verified.');
    }

    const latestCode =
      await this.emailVerificationCodeRepository.findLatestActiveByUserId(
        user.id,
      );

    if (
      latestCode &&
      differenceInSeconds(new Date(), latestCode.createdAt) <
        RESEND_COOLDOWN_SECONDS
    ) {
      throw new HttpException(
        'Please wait before requesting a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.emailVerificationService.issueVerificationCode({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { sent: true };
  }
}
