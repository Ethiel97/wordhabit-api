import { Command } from '@nestjs/cqrs';
import { GetActiveUserLearningProfileResult } from '../queries/get-active-user-learning-profile.query';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';

export type SwapReminderCommandResult = GetActiveUserLearningProfileResult;

export class SwapReminderSlotCommand extends Command<SwapReminderCommandResult> {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
    public readonly reminderSlot: NotificationSlot,
  ) {
    super();
  }
}
