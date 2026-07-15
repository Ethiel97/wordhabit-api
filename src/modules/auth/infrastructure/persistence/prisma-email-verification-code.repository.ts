import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  CreateEmailVerificationCodeParams,
  EmailVerificationCodeRepository,
} from '../../domain/repositories/email-verification-code.repository';
import { EmailVerificationCode } from '../../domain/entities/email-verification-code';
import { PrismaEmailVerificationCodeMapper } from './prisma-email-verification-code.mapper';

@Injectable()
export class PrismaEmailVerificationCodeRepository implements EmailVerificationCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateEmailVerificationCodeParams,
  ): Promise<EmailVerificationCode> {
    const code = await this.prisma.emailVerificationCode.create({
      data: {
        userId: params.userId,
        codeHash: params.codeHash,
        expiresAt: params.expiresAt,
      },
    });
    return PrismaEmailVerificationCodeMapper.toDomain(code);
  }

  async findLatestActiveByUserId(
    userId: string,
  ): Promise<EmailVerificationCode | null> {
    const code = await this.prisma.emailVerificationCode.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!code) {
      return null;
    }

    return PrismaEmailVerificationCodeMapper.toDomain(code);
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.emailVerificationCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.emailVerificationCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.prisma.emailVerificationCode.deleteMany({
      where: { userId, consumedAt: null },
    });
  }
}
