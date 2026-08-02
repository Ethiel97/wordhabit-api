import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NOTIFICATIONS_SENDER_QUEUE } from './infrastructure/queue/notifications-queue.constants';
import { DailyWordScheduler } from './application/schedulers/daily-word.scheduler';
import { DailyWordSenderProcessor } from '../../shared/infrastructure/queue/daily-word-sender.processor';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { NotificationModule } from '../../shared/infrastructure/notification/notification.module';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [
    NotificationModule,
    // For TodayWordService: the push carries a wordId, so the day's word
    // has to be assigned before it is announced.
    LearningModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_SENDER_QUEUE }),
  ],
  providers: [
    DailyWordScheduler,
    DailyWordSenderProcessor,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
  ],
})
export class NotificationsWorkerModule {}
