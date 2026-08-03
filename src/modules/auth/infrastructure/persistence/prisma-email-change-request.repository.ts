import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { EmailChangeRequest } from '../../domain/entities/email-change-request';
import {
  CreateEmailChangeRequestParams,
  EmailChangeRequestRepository,
} from '../../domain/repositories/email-change-request.repository';

@Injectable()
export class PrismaEmailChangeRequestRepository implements EmailChangeRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    params: CreateEmailChangeRequestParams,
  ): Promise<EmailChangeRequest> {
    return this.prisma.emailChangeRequest.create({ data: params });
  }

  async findLatestActiveByUserId(
    userId: string,
  ): Promise<EmailChangeRequest | null> {
    return this.prisma.emailChangeRequest.findFirst({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementAttempts(requestId: string): Promise<void> {
    await this.prisma.emailChangeRequest.update({
      where: { id: requestId },
      data: { attempts: { increment: 1 } },
    });
  }

  async consume(requestId: string): Promise<void> {
    await this.prisma.emailChangeRequest.update({
      where: { id: requestId },
      data: { consumedAt: new Date() },
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.prisma.emailChangeRequest.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}
