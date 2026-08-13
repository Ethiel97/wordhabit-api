import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetVocabularyWordByIdQuery,
  GetVocabularyWordByIdResult,
} from '../queries/get-vocabulary-word-by-id.query';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  VOCABULARY_REPOSITORY,
  type VocabularyRepository,
} from '../../domain/repositories/vocabulary.repository';

@QueryHandler(GetVocabularyWordByIdQuery)
export class GetVocabularyWordByIdHandler implements IQueryHandler<
  GetVocabularyWordByIdQuery,
  GetVocabularyWordByIdResult
> {
  constructor(
    @Inject(VOCABULARY_REPOSITORY)
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  async execute(
    query: GetVocabularyWordByIdQuery,
  ): Promise<GetVocabularyWordByIdResult> {
    const aggregate = await this.vocabularyRepository.findWordById(
      query.wordId,
    );

    if (!aggregate) {
      throw new NotFoundException('Vocabulary word not found.');
    }

    return {
      id: aggregate.word.id,
      term: aggregate.word.term,
      normalizedTerm: aggregate.word.normalizedTerm,
      targetLanguage: aggregate.word.targetLanguage,
      difficulty: aggregate.word.difficulty,
      partOfSpeech: aggregate.word.partOfSpeech,
      status: aggregate.word.status,
      createdAt: aggregate.word.createdAt,
      updatedAt: aggregate.word.updatedAt,
      definitions: aggregate.definitions.map((definition) => ({
        id: definition.id,
        wordId: definition.wordId,
        explanationLanguage: definition.explanationLanguage,
        text: definition.text,
        register: definition.register,
        createdAt: definition.createdAt,
      })),
      examples: aggregate.examples.map((example) => ({
        id: example.id,
        sentence: example.sentence,
        translation: example.translation,
        translationLanguage: example.translationLanguage,
        createdAt: example.createdAt,
        wordId: example.wordId,
      })),
      pronunciations: aggregate.pronunciations.map((pronunciation) => ({
        id: pronunciation.id,
        phonetic: pronunciation.phonetic,
        audioUrl: pronunciation.audioUrl,
        provider: pronunciation.provider,
        createdAt: pronunciation.createdAt,
        wordId: pronunciation.wordId,
      })),
      synonyms: aggregate.synonyms.map((synonym) => ({
        id: synonym.id,
        value: synonym.value,
        createdAt: synonym.createdAt,
        wordId: synonym.wordId,
      })),
      antonyms: aggregate.antonyms.map((antonym) => ({
        id: antonym.id,
        value: antonym.value,
        createdAt: antonym.createdAt,
        wordId: antonym.wordId,
      })),
    };
  }
}
