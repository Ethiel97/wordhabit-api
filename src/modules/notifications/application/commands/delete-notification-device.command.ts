import { Command } from '@nestjs/cqrs';

export class DeleteNotificationDeviceCommand extends Command<DeleteNotificationDeviceResult> {
  constructor(
    public readonly userId: string,
    public readonly token: string,
  ) {
    super();
  }
}

export type DeleteNotificationDeviceResult = {
  success: boolean;
};
