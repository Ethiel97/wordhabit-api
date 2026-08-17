import { Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

/**
 * The learner's own calendar day. Required rather than derived: the
 * window a repair is allowed in is measured in their calendar, and the
 * server's date names a different day far from its timezone.
 */
export class RepairStreakRequestDto {
  @Matches(LOCAL_DATE_PATTERN, {
    message: 'localDate must be a yyyy-MM-dd date',
  })
  localDate!: string;
}
