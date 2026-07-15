import { EmailVerificationCode } from '../../domain/entities/email-verification-code';

import type { EmailVerificationCodeModel as PrismaEmailVerificationCode } from 'generated/prisma/models';

export class PrismaEmailVerificationCodeMapper {
  static toDomain(model: PrismaEmailVerificationCode): EmailVerificationCode {
    return {
      id: model.id,
      userId: model.userId,
      codeHash: model.codeHash,
      expiresAt: model.expiresAt,
      consumedAt: model.consumedAt,
      attempts: model.attempts,
      createdAt: model.createdAt,
    };
  }
}
