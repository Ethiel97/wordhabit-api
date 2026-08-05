import { Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class GetLearnerXpRequestDto {
  /** The caller's today, `yyyy-MM-dd`, which the pace window ends on. */
  @Matches(LOCAL_DATE_PATTERN, { message: 'to must be a yyyy-MM-dd date' })
  to!: string;
}
