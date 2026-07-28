import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  USER_ACTIVITY_DEFAULT_DAYS,
  USER_ACTIVITY_MAX_DAYS,
} from '../queries/get-user-activity.query';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class GetUserActivityRequestDto {
  /**
   * The caller's today, `yyyy-MM-dd`. The window ends here and runs back
   * [days] - 1 days.
   */
  @Matches(LOCAL_DATE_PATTERN, { message: 'to must be a yyyy-MM-dd date' })
  to!: string;

  /** How many days the window covers, inclusive of [to]. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USER_ACTIVITY_MAX_DAYS)
  days = USER_ACTIVITY_DEFAULT_DAYS;
}
