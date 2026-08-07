import { IsIn } from 'class-validator';
import { QuizMode } from '../../domain/entities/quiz';

export class GetWordQuizRequestDto {
  @IsIn(Object.values(QuizMode))
  mode!: QuizMode;
}
