import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetSharedWordQuery,
  GetSharedWordQueryResult,
} from '../queries/get-shared-word.query';
import {
  VOCABULARY_REPOSITORY,
  type VocabularyRepository,
} from '../../domain/repositories/vocabulary.repository';
import { Inject, NotFoundException } from '@nestjs/common';

@QueryHandler(GetSharedWordQuery)
export class GetSharedWordHandler implements IQueryHandler<
  GetSharedWordQuery,
  GetSharedWordQueryResult
> {
  constructor(
    @Inject(VOCABULARY_REPOSITORY)
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  async execute(query: GetSharedWordQuery): Promise<GetSharedWordQueryResult> {
    const aggregate = await this.vocabularyRepository.findWordById(
      query.wordId,
    );

    if (!aggregate) {
      throw new NotFoundException('Shared word not found.');
    }

    return {
      id: aggregate.word.id,
      term: aggregate.word.term,
      pronunciation: aggregate.pronunciations[0]?.phonetic || null,
      partOfSpeech: aggregate.word.partOfSpeech,
      targetLanguage: aggregate.word.targetLanguage,
      definitions: aggregate.definitions.map((definition) => ({
        id: definition.id,
        wordId: definition.wordId,
        explanationLanguage: definition.explanationLanguage,
        text: definition.text,
        register: definition.register,
        createdAt: definition.createdAt,
      })),
      example: {
        sentence:
          aggregate.examples.length > 0 ? aggregate.examples[0].sentence : null,
      },
    };
  }
}
