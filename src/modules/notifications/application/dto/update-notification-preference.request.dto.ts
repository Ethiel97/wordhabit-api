import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NotificationSlot } from '../../domain/entities/notification';

export class UpdateNotificationPreferenceRequestDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(NotificationSlot, {
    message: `slot must be one of the following values: ${Object.values(NotificationSlot).join(', ')}`,
  })
  slot?: NotificationSlot;
}
