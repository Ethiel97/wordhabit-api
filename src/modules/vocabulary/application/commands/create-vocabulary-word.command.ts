import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { Command } from '@nestjs/cqrs';
import { LanguageCode } from '../../domain/entities/language-code';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';

export class CreateVocabularyWordCommand extends Command<CreateVocabularyWordResult> {
  constructor(public readonly word: CreateVocabularyWordInput) {
    super();
  }
}

export interface CreateVocabularyWordInput {
  term: string;
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  partOfSpeech: PartOfSpeech;
  definitions: CreateVocabularyWordDefinitionInput[];
  examples: CreateVocabularyWordExampleInput[];
  pronunciations: CreateVocabularyWordPronunciationInput[];
  synonyms: CreateVocabularyWordSynonymInput[];
  antonyms: CreateVocabularyWordAntonymInput[];
  quizScenarios: CreateVocabularyWordQuizScenarioInput[];
  themeSlugs: string[];
}

export interface CreateVocabularyWordAntonymInput {
  value: string;
}

export interface CreateVocabularyWordQuizScenarioInput {
  language: LanguageCode;
  situation: string;
  question: string;
  correct: string;
  distractors: string[];
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
