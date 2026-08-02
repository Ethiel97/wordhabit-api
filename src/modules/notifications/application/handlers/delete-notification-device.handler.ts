import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DeleteNotificationDeviceCommand,
  DeleteNotificationDeviceResult,
} from '../commands/delete-notification-device.command';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../domain/repositories/notification.repository';

@CommandHandler(DeleteNotificationDeviceCommand)
export class DeleteNotificationDeviceHandler implements ICommandHandler<DeleteNotificationDeviceCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
  ) {}

  async execute(
    command: DeleteNotificationDeviceCommand,
  ): Promise<DeleteNotificationDeviceResult> {
    const result = await this.repository.deleteNotificationDevice({
      userId: command.userId,
      token: command.token,
    });
    return { success: result };
  }
}
