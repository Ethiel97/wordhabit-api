import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { Command } from '@nestjs/cqrs';
import { LanguageCode } from '../../domain/entities/language-code';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';

export class CreateVocabularyWordCommand extends Command<CreateVocabularyWordResult> {
  constructor(
    public readonly term: string,
    public readonly targetLanguage: LanguageCode,
    public readonly difficulty: WordDifficulty,
    public readonly partOfSpeech: PartOfSpeech,
    public readonly definitions: CreateVocabularyWordDefinitionInput[] = [],
    public readonly examples: CreateVocabularyWordExampleInput[] = [],
    public readonly pronunciations: CreateVocabularyWordPronunciationInput[],
    public readonly synonyms: CreateVocabularyWordSynonymInput[] = [],
  ) {
    super();
  }
}

export interface CreateVocabularyWordDefinitionInput {
  explanationLanguage: string;
  text: string;
  register?: string;
}

export interface CreateVocabularyWordPronunciationInput {
  phonetic?: string;
  audioUrl?: string;
  provider?: string;
}

export interface CreateVocabularyWordExampleInput {
  sentence: string;
  translation?: string;
  translationLanguage?: string;
}

export interface CreateVocabularyWordSynonymInput {
  value: string;
}

export interface CreateVocabularyWordResult {
  id: string;
  term: string;
  normalizedTerm: string;
  targetLanguage: string;
  difficulty: WordDifficulty;
  partOfSpeech: string;
  status: string;
  createdAt: Date;
}
