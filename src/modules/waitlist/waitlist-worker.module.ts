import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WAITLIST_QUEUE } from './infrastructure/queue/waitlist-queue.constants';
import { MailerModule } from '../../shared/infrastructure/mailer/mailer.module';
import { WaitlistProcessor } from './infrastructure/queue/waitlist.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: WAITLIST_QUEUE,
    }),
    MailerModule,
  ],
  providers: [WaitlistProcessor],
})
export class WaitlistWorkerModule {}
