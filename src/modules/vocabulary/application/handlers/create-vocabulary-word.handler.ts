import {
  CreateVocabularyWordCommand,
  CreateVocabularyWordResult,
} from '../commands/create-vocabulary-word.command';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import {
  VOCABULARY_REPOSITORY,
  type VocabularyRepository,
} from '../../domain/repositories/vocabulary.repository';
import { LanguageCode } from '../../domain/entities/language-code';

@CommandHandler(CreateVocabularyWordCommand)
export class CreateVocabularyWordHandler implements ICommandHandler<
  CreateVocabularyWordCommand,
  CreateVocabularyWordResult
> {
  constructor(
    @Inject(VOCABULARY_REPOSITORY)
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  async execute(
    command: CreateVocabularyWordCommand,
  ): Promise<CreateVocabularyWordResult> {
    const normalizedTerm = command.word.term.toLowerCase().trim();

    const existing = await this.vocabularyRepository.findByNormalizedTerm({
      normalizedTerm,
      targetLanguage: command.word.targetLanguage,
    });

    if (existing) {
      throw new ConflictException(
        `This word already exists in the vocabulary for the target language.`,
      );
    }

    const aggregate = await this.vocabularyRepository.createWord({
      term: command.word.term.trim(),
      normalizedTerm,
      targetLanguage: command.word.targetLanguage,
      difficulty: command.word.difficulty,
      partOfSpeech: command.word.partOfSpeech,
      definitions: command.word.definitions.map((def) => ({
        explanationLanguage: def.explanationLanguage as LanguageCode,
        text: def.text.trim(),
        register: def.register?.trim() ?? null,
      })),
      examples: command.word.examples.map((ex) => ({
        sentence: ex.sentence.trim(),
        translation: ex.translation?.trim() ?? null,
        translationLanguage: ex.translationLanguage ?? null,
      })),
      pronunciations: command.word.pronunciations.map((pr) => ({
        phonetic: pr.phonetic?.trim() ?? null,
        audioUrl: pr.audioUrl?.trim() ?? null,
        provider: pr.provider?.trim() ?? null,
      })),
      synonyms: command.word.synonyms.map((syn) => ({
        value: syn.value.trim(),
      })),
      themeSlugs: command.word.themeSlugs,
    });

    return {
      id: aggregate.word.id,
      createdAt: aggregate.word.createdAt,
      difficulty: aggregate.word.difficulty,
      partOfSpeech: aggregate.word.partOfSpeech,
      status: aggregate.word.status,
      targetLanguage: aggregate.word.targetLanguage,
      term: aggregate.word.term,
      normalizedTerm: aggregate.word.normalizedTerm,
    };
  }
}
