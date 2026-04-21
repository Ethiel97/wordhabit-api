import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WaitlistController } from './presentation/http/waitlist-controller/waitlist.controller';
import { JoinWaitlistHandler } from './application/handlers/join-waitlist.handler';
import { PrismaWaitlistRepository } from './infrastructure/persistence/prisma-waitlist.repository';
import { WAITLIST_REPOSITORY } from './domain/repositories/waitlist.repository';

@Module({
  imports: [CqrsModule],
  controllers: [WaitlistController],
  providers: [
    JoinWaitlistHandler,
    PrismaWaitlistRepository,
    {
      provide: WAITLIST_REPOSITORY,
      useExisting: PrismaWaitlistRepository,
    },
  ],
})
export class WaitlistModule {}
