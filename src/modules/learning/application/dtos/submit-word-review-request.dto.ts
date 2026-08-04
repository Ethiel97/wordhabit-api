import { IsBoolean, Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class SubmitWordReviewRequestDto {
  @IsBoolean()
  correct!: boolean;

  /**
   * The calendar day this review happened on for the user,
   * `yyyy-MM-dd`. Required rather than inferred: guessing the timezone
   * is what makes streaks and heatmaps drift.
   */
  @Matches(LOCAL_DATE_PATTERN, {
    message: 'localDate must be a yyyy-MM-dd date',
  })
  localDate!: string;
}
