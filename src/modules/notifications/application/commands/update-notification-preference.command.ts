import {
  NotificationChannel,
  NotificationPreferencesResult,
  NotificationSlot,
} from '../../domain/entities/notification';
import { Command } from '@nestjs/cqrs';

export class UpdateNotificationPreferenceCommand extends Command<UpdateNotificationPreferenceResult> {
  constructor(
    public readonly userId: string,
    public readonly channel: NotificationChannel,
    public readonly enabled?: boolean,
    public readonly slot?: NotificationSlot | null,
  ) {
    super();
  }
}

export type UpdateNotificationPreferenceResult = NotificationPreferencesResult;
