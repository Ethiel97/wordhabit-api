import { NotificationSlot } from '../../../notifications/domain/entities/notification';
import { IsEnum } from 'class-validator';

export class SwapReminderSlotDto {
  @IsEnum(NotificationSlot)
  reminderSlot!: NotificationSlot;
}
