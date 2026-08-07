import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuizMode } from '../../domain/entities/quiz';

export class SubmitQuizResultRequestDto {
  @IsString()
  @IsNotEmpty()
  wordId!: string;

  @IsIn(Object.values(QuizMode))
  mode!: QuizMode;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  correctCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionCount!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  localDate!: string;
}
