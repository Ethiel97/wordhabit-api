import { IsEnum } from 'class-validator';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

export class SetUserWordProgressRequestDto {
  @IsEnum(UserWordProgressStatus)
  status!: UserWordProgressStatus;
}
