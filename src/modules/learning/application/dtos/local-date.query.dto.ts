import { Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

/**
 * The caller's calendar day, required rather than derived: the server's
 * own date names a different day far from its timezone, and the worker
 * would announce a word the app does not consider today's.
 */
export class LocalDateQueryDto {
  @Matches(LOCAL_DATE_PATTERN, {
    message: 'localDate must be a yyyy-MM-dd date',
  })
  localDate!: string;
}
