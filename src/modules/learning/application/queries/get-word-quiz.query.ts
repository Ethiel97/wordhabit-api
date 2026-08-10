import { Query } from '@nestjs/cqrs';
import { QuizMode, WordQuiz } from '../../domain/entities/quiz';

export type GetWordQuizResult = WordQuiz;

export class GetWordQuizQuery extends Query<GetWordQuizResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
    public readonly mode: QuizMode,
  ) {
    super();
  }
}
