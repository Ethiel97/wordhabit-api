import { IsBoolean, Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class SubmitWordReviewRequestDto {
  @IsBoolean()
  correct!: boolean;

  /**
   * The calendar day this review happened on for the user, `yyyy-MM-dd`.
   *
   * Required rather than inferred: the server cannot know the user's
   * timezone, and guessing it is what makes streaks and heatmaps drift.
   * Recording the day the client reports keeps every later read a plain
   * string comparison.
   */
  @Matches(LOCAL_DATE_PATTERN, {
    message: 'localDate must be a yyyy-MM-dd date',
  })
  localDate!: string;
}
