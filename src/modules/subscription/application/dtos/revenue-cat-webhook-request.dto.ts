import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * Validates only the fields the decision reads, and lets the rest of
 * RevenueCat's payload through untouched. Whitelisting the whole event
 * would turn every field they add into a 400 on a webhook we cannot
 * replay by hand.
 */
export class RevenueCatEventDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  app_user_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entitlement_ids?: string[];

  @IsOptional()
  @IsInt()
  expiration_at_ms?: number;

  @IsOptional()
  @IsString()
  store?: string;
}

export class RevenueCatWebhookRequestDto {
  @ValidateNested()
  @Type(() => RevenueCatEventDto)
  event!: RevenueCatEventDto;
}
