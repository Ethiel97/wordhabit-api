import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { USER_ACTIVITY_DETAIL_WORD_LIMIT } from '../queries/get-user-activity-detail.query';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class GetUserActivityDetailRequestDto {
  /** Inclusive `yyyy-MM-dd`; equal to [to] for a single tapped day. */
  @Matches(LOCAL_DATE_PATTERN, { message: 'from must be a yyyy-MM-dd date' })
  from!: string;

  @Matches(LOCAL_DATE_PATTERN, { message: 'to must be a yyyy-MM-dd date' })
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = USER_ACTIVITY_DETAIL_WORD_LIMIT;
}
