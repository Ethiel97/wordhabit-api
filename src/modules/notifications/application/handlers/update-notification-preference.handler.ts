import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../domain/repositories/notification.repository';
import { UpdateNotificationPreferenceCommand } from '../commands/update-notification-preference.command';
import { NotificationPreferencesResult } from '../../domain/entities/notification';

@CommandHandler(UpdateNotificationPreferenceCommand)
export class UpdateNotificationPreferenceHandler implements ICommandHandler<UpdateNotificationPreferenceCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
  ) {}

  async execute(
    command: UpdateNotificationPreferenceCommand,
  ): Promise<NotificationPreferencesResult> {
    return this.repository.updateNotificationPreference({
      userId: command.userId,
      channel: command.channel,
      enabled: command.enabled,
      slot: command.slot,
    });
  }
}
