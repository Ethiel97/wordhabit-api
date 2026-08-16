import { BadRequestException } from '@nestjs/common';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  validate,
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

  @IsOptional()
  @IsInt()
  event_timestamp_ms?: number;
}

export class RevenueCatWebhookRequestDto {
  // IsDefined as well: ValidateNested alone passes a body with no
  // `event` at all, which would reach the handler and throw there.
  @IsDefined()
  @ValidateNested()
  @Type(() => RevenueCatEventDto)
  event!: RevenueCatEventDto;
}

/**
 * Validates the webhook body by hand, away from the global pipe.
 *
 * The pipe whitelists and forbids whatever a DTO does not declare,
 * which rejected every RevenueCat event with a 400 before it reached
 * the handler — their payload carries two dozen fields this server has
 * no opinion about. A route-level pipe cannot undo that: pipes compose,
 * the global one runs first and throws. So the route takes an untyped
 * body, which the pipe skips, and validation happens here instead —
 * still strict about the fields the decision reads.
 */
export async function parseRevenueCatWebhook(
  body: unknown,
): Promise<RevenueCatWebhookRequestDto> {
  const dto = plainToInstance(RevenueCatWebhookRequestDto, body ?? {});
  const errors = await validate(dto, {
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    throw new BadRequestException(
      `Unusable RevenueCat payload: ${errors.map((error) => error.property).join(', ')}`,
    );
  }

  return dto;
}
