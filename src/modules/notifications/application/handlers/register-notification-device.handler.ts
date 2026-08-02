import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterNotificationDeviceCommand } from '../commands/register-notification-device.command';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../domain/repositories/notification.repository';
import { NotificationDevice } from '../../domain/entities/notification';

@CommandHandler(RegisterNotificationDeviceCommand)
export class RegisterNotificationDeviceHandler implements ICommandHandler<RegisterNotificationDeviceCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
  ) {}

  async execute(
    command: RegisterNotificationDeviceCommand,
  ): Promise<NotificationDevice> {
    return await this.repository.registerNotificationDevice({
      platform: command.platform,
      token: command.token,
      timeZone: command.timeZone,
      userId: command.userId,
    });
  }
}
