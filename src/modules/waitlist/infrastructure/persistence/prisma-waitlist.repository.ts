import {
  WaitlistEntryRecord,
  WaitlistRepository,
} from '../../domain/repositories/waitlist.repository';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class PrismaWaitlistRepository implements WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(params: {
    email: string;
    source?: string;
  }): Promise<WaitlistEntryRecord> {
    return this.prisma.waitlistEntry.create({
      data: {
        email: params.email.toLowerCase().trim(),
        source: params.source?.trim() ?? null,
      },
    });
  }

  findByEmail(email: string): Promise<WaitlistEntryRecord | null> {
    return this.prisma.waitlistEntry.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });
  }
}
