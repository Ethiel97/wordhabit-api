import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetRandomWordQuery,
  GetRandomWordResult,
} from '../queries/get-random-word.query';
import type { TodayWordRepository } from '../../domain/repositories/learning.repository';
import { TODAY_WORD_REPOSITORY } from '../../domain/repositories/learning.repository';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

@QueryHandler(GetRandomWordQuery)
export class GetRandomWordHandler implements IQueryHandler<
  GetRandomWordQuery,
  GetRandomWordResult
> {
  constructor(
    @Inject(TODAY_WORD_REPOSITORY)
    private readonly todayWordRepository: TodayWordRepository,
  ) {}

  async execute(query: GetRandomWordQuery): Promise<GetRandomWordResult> {
    const word = await this.todayWordRepository.findRandomWord({
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
