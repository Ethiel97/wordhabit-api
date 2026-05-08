import { WaitlistRepository } from '../../domain/repositories/waitlist.repository';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { WaitlistEntry } from '../../domain/entities/wailist-entry';

@Injectable()
export class PrismaWaitlistRepository implements WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  count(): Promise<number> {
    return this.prisma.waitlistEntry.count();
  }

  findAll(): Promise<WaitlistEntry[]> {
    return this.prisma.waitlistEntry.findMany();
  }

  create(params: { email: string; source?: string }): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.create({
      data: {
        email: params.email.toLowerCase().trim(),
        source: params.source?.trim() ?? null,
      },
    });
  }

  findByEmail(email: string): Promise<WaitlistEntry | null> {
    return this.prisma.waitlistEntry.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });
  }
}
