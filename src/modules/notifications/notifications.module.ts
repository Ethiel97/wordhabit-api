import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { RegisterNotificationDeviceHandler } from './application/handlers/register-notification-device.handler';
import { DeleteNotificationDeviceHandler } from './application/handlers/delete-notification-device.handler';
import { GetNotificationPreferencesHandler } from './application/handlers/get-notification-preferences.handler';
import { UpdateNotificationPreferenceHandler } from './application/handlers/update-notification-preference.handler';
import { NotificationsController } from './presentation/http/notification.controller';

const commandHandlers = [
  UpdateNotificationPreferenceHandler,
  RegisterNotificationDeviceHandler,
  DeleteNotificationDeviceHandler,
];

const queryHandlers = [GetNotificationPreferencesHandler];

@Module({
  imports: [CqrsModule],
  controllers: [NotificationsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,

    PrismaNotificationRepository,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}
