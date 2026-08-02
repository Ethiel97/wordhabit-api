import { Command } from '@nestjs/cqrs';
import {
  NotificationDevice,
  Platform,
} from '../../domain/entities/notification';

export class RegisterNotificationDeviceCommand extends Command<RegisterNotificationDeviceResult> {
  constructor(
    public readonly userId: string,
    public readonly token: string,
    public readonly timeZone: string,
    public readonly platform: Platform,
  ) {
    super();
  }
}

export type RegisterNotificationDeviceResult = NotificationDevice;
