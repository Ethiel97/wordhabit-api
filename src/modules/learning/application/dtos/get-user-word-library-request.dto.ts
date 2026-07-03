import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { USER_WORD_LIBRARY_LIMIT } from '../queries/get-user-word-library.query';
import { Type } from 'class-transformer';

export class GetUserWordLibraryRequestDto {
  @IsOptional()
  @IsEnum(UserWordProgressStatus)
  status?: UserWordProgressStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = USER_WORD_LIBRARY_LIMIT;

  @IsOptional()
  @IsString()
  cursor?: string;
}
