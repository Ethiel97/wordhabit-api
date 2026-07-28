import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetRandomWordQuery,
  GetRandomWordResult,
} from '../queries/get-random-word.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

@QueryHandler(GetRandomWordQuery)
export class GetRandomWordHandler implements IQueryHandler<
  GetRandomWordQuery,
  GetRandomWordResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(query: GetRandomWordQuery): Promise<GetRandomWordResult> {
    const word = await this.learningRepository.findRandomWord({
      targetLanguage: query.targetLanguage || LanguageCode.EN,
      difficulty: query.difficulty,
      themes: query.themes,
    });

    if (!word) {
      throw new CandidateWordNotFoundError(
        'No candidate word found. Please check the database and ensure there are words available.',
      );
    }

    return word;
  }
}
