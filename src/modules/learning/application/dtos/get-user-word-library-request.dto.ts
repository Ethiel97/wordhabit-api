import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { USER_WORD_LIBRARY_LIMIT } from '../queries/get-user-word-library.query';
import { Transform, Type } from 'class-transformer';

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

  /** Query strings carry no booleans; `?savedOnly=true` is the shape. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  savedOnly?: boolean;
}
