import { IsEnum, Matches } from 'class-validator';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';
import { LOCAL_DATE_PATTERN } from '../../domain/services/local-date';

export class SetUserWordProgressRequestDto {
  @IsEnum(UserWordProgressStatus)
  status!: UserWordProgressStatus;

  /** The client's calendar day, `yyyy-MM-dd`; advances the streak. */
  @Matches(LOCAL_DATE_PATTERN, {
    message: 'localDate must be a yyyy-MM-dd date',
  })
  localDate!: string;
}
