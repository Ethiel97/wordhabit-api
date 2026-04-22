import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ListVocabularyWordsQuery,
  ListVocabularyWordsResult,
} from '../queries/list-vocabulary-words.query';
import {
  VOCABULARY_REPOSITORY,
  type VocabularyRepository,
} from '../../domain/repositories/vocabulary.repository';

@QueryHandler(ListVocabularyWordsQuery)
export class ListVocabularyWordsHandler implements IQueryHandler<
  ListVocabularyWordsQuery,
  ListVocabularyWordsResult
> {
  constructor(
    @Inject(VOCABULARY_REPOSITORY)
    private readonly repository: VocabularyRepository,
  ) {}

  async execute(
    query: ListVocabularyWordsQuery,
  ): Promise<ListVocabularyWordsResult> {
    return this.repository.listWords({
      page: query.page,
      pageSize: query.pageSize,
      targetLanguage: query.targetLanguage,
      difficulty: query.difficulty,
      partOfSpeech: query.partOfSpeech,
      status: query.status,
      search: query.search?.trim() || undefined,
    });
  }
}
