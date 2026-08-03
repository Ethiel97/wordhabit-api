import { IsBoolean, Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class RescheduleWordReviewRequestDto {
  /** The learner's verdict: they know the word, or it is still hard. */
  @IsBoolean()
  known!: boolean;

  /**
   * The calendar day the correction was made on, `yyyy-MM-dd`.
   *
   * Intervals count from the learner's own day, never the server's — see
   * `SubmitWordReviewRequestDto`.
   */
  @Matches(LOCAL_DATE_PATTERN, {
    message: 'localDate must be a yyyy-MM-dd date',
  })
  localDate!: string;
}
