import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomInt } from 'crypto';
import { addMinutes } from 'date-fns';
import {
  EMAIL_VERIFICATION_CODE_REPOSITORY,
  type EmailVerificationCodeRepository,
} from '../../domain/repositories/email-verification-code.repository';
import {
  PASSWORD_SERVICE,
  type PasswordService,
} from '../../domain/services/password-service';
import {
  AUTH_EMAIL_QUEUE,
  SEND_VERIFICATION_EMAIL_JOB,
  SendVerificationEmailJobData,
} from '../../infrastructure/queue/auth-email-queue.constants';
import {
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_TTL_MINUTES,
} from '../../domain/email-verification.policy';

export interface IssueVerificationCodeParams {
  userId: string;
  email: string;
  name: string;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @Inject(EMAIL_VERIFICATION_CODE_REPOSITORY)
    private readonly emailVerificationCodeRepository: EmailVerificationCodeRepository,

    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService,

    @InjectQueue(AUTH_EMAIL_QUEUE)
    private readonly authEmailQueue: Queue,
  ) {}

  /**
   * Generates a fresh verification code for the user, invalidating any
   * previous pending code, and enqueues the verification email.
   */
  async issueVerificationCode(
    params: IssueVerificationCodeParams,
  ): Promise<void> {
    const code = this.generateCode();
    const codeHash = await this.passwordService.hash(code);

    await this.emailVerificationCodeRepository.invalidateAllForUser(
      params.userId,
    );

    await this.emailVerificationCodeRepository.create({
      userId: params.userId,
      codeHash,
      expiresAt: addMinutes(new Date(), VERIFICATION_CODE_TTL_MINUTES),
    });

    const jobData: SendVerificationEmailJobData = {
      email: params.email,
      name: params.name,
      code,
    };

    await this.authEmailQueue.add(SEND_VERIFICATION_EMAIL_JOB, jobData, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Verification code issued for user ${params.userId}`);
  }

  private generateCode(): string {
    const max = 10 ** VERIFICATION_CODE_LENGTH;
    return randomInt(0, max).toString().padStart(VERIFICATION_CODE_LENGTH, '0');
  }
}
