import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WaitlistController } from './presentation/http/waitlist-controller/waitlist.controller';
import { JoinWaitlistHandler } from './application/handlers/join-waitlist.handler';
import { PrismaWaitlistRepository } from './infrastructure/persistence/prisma-waitlist.repository';
import { WAITLIST_REPOSITORY } from './domain/repositories/waitlist.repository';
import { GetWaitlistCountHandler } from './application/handlers/get-waitlist-count.handler';
import { GetWaitlistEntryHandler } from './application/handlers/get-waitlist-entry.handler';
import { GetWaitlistEntriesHandler } from './application/handlers/get-waitlist-entries.handler';
import { BullModule } from '@nestjs/bullmq';
import { WAITLIST_QUEUE } from './infrastructure/queue/waitlist-queue.constants';
import { SendWaitlistConfirmationEmailHandler } from './application/handlers/send-waitlist-confirmation-email.handler';

const commandHandlers = [JoinWaitlistHandler];

const queryHandlers = [
  GetWaitlistCountHandler,
  GetWaitlistEntriesHandler,
  GetWaitlistEntryHandler,
];

const eventHandlers = [SendWaitlistConfirmationEmailHandler];

@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({
      name: WAITLIST_QUEUE,
    }),
  ],
  controllers: [WaitlistController],
  providers: [
    ...eventHandlers,
    ...commandHandlers,
    ...queryHandlers,
    PrismaWaitlistRepository,
    {
      provide: WAITLIST_REPOSITORY,
      useExisting: PrismaWaitlistRepository,
    },
  ],
})
export class WaitlistModule {}
