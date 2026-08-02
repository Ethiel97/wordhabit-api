import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATIONS_SENDER_QUEUE } from '../notifications/infrastructure/queue/notifications-queue.constants';
import { DailyWordSenderProcessor } from '../../shared/infrastructure/queue/daily-word-sender.processor';
import { DailyWordScheduler } from '../notifications/application/schedulers/daily-word.scheduler';
import { NotificationModule } from '../../shared/infrastructure/notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_SENDER_QUEUE,
    }),
    NotificationModule,
  ],
  providers: [DailyWordSenderProcessor, DailyWordScheduler],
})
export class NotificationsWorkerModule {}
