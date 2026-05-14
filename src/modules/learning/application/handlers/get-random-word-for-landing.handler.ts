import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  GetRandomWordForLandingQuery,
  GetRandomWordForLandingResult,
} from '../queries/get-random-word-for-landing.query';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import { CandidateWordNotFoundError } from '../errors/candidate-word-not-found.error';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

@QueryHandler(GetRandomWordForLandingQuery)
export class GetRandomWordForLandingHandler implements IQueryHandler<
  GetRandomWordForLandingQuery,
  GetRandomWordForLandingResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    query: GetRandomWordForLandingQuery,
  ): Promise<GetRandomWordForLandingResult> {
    const word = await this.learningRepository.findRandomWord({
      targetLanguage: query.targetLanguage || LanguageCode.EN,
    });

    if (!word) {
      throw new CandidateWordNotFoundError(
        'No candidate word found for landing page. Please check the database and ensure there are words available.',
      );
    }

    return word;
  }
}
