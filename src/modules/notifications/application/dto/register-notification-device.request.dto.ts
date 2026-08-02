import { IsEnum, IsString, MinLength } from 'class-validator';
import { Platform } from '../../domain/entities/notification';

export class RegisterNotificationDeviceRequestDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsEnum(Platform)
  platform!: Platform;

  @IsString()
  @MinLength(1)
  timeZone!: string;
}
