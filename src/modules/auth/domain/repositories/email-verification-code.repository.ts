import { EmailVerificationCode } from '../entities/email-verification-code';

export const EMAIL_VERIFICATION_CODE_REPOSITORY = Symbol(
  'EMAIL_VERIFICATION_CODE_REPOSITORY',
);

export interface CreateEmailVerificationCodeParams {
  userId: string;
  codeHash: string;
  expiresAt: Date;
}

export interface EmailVerificationCodeRepository {
  create(
    params: CreateEmailVerificationCodeParams,
  ): Promise<EmailVerificationCode>;

  findLatestActiveByUserId(
    userId: string,
  ): Promise<EmailVerificationCode | null>;

  incrementAttempts(id: string): Promise<void>;

  markConsumed(id: string): Promise<void>;

  invalidateAllForUser(userId: string): Promise<void>;
}
