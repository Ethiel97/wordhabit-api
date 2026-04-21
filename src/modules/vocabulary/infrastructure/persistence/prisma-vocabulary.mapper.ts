import {
  LanguageCode as PrismaLanguageCode,
  PartOfSpeech as PrismaPartOfSpeech,
  VocabularyWordStatus as PrismaVocabularyWordStatus,
  WordDifficulty as PrismaWordDifficulty,
} from 'generated/prisma/enums';

import type {
  VocabularyWordModel as PrismaVocabularyWord,
  WordDefinitionModel as PrismaWordDefinition,
  WordExampleModel as PrismaWordExample,
  WordPronunciationModel as PrismaWordPronunciation,
  WordSynonymModel as PrismaWordSynonym,
} from 'generated/prisma/models';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';
import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { WordSynonym } from '../../domain/entities/word-synonym';
import { VocabularyWordStatus } from '../../domain/entities/vocabulary-word-status';
import { VocabularyWord } from '../../domain/entities/vocabulary-word';
import { WordDefinition } from '../../domain/entities/word-definition';
import { WordExample } from '../../domain/entities/word-example';
import { WordPronunciation } from '../../domain/entities/word-pronounciation';
import { VocabularyWordAggregate } from '../../domain/repositories/vocabulary.repository';
import { LanguageCode } from '../../domain/entities/language-code';

export class PrismaVocabularyMapper {
  static toDomainDifficulty(value: PrismaWordDifficulty): WordDifficulty {
    switch (value) {
      case 'BEGINNER':
        return WordDifficulty.BEGINNER;
      case 'INTERMEDIATE':
        return WordDifficulty.INTERMEDIATE;
      case 'ADVANCED':
        return WordDifficulty.ADVANCED;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled difficulty: ${value}`);
      }
    }
  }

  static toPrismaLanguageCode(value: LanguageCode): PrismaLanguageCode {
    switch (value) {
      case LanguageCode.EN:
        return PrismaLanguageCode.EN;
      case LanguageCode.ES:
        return PrismaLanguageCode.ES;
      case LanguageCode.FR:
        return PrismaLanguageCode.FR;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled language code: ${value}`);
      }
    }
  }

  static toDomainLanguageCode(value: PrismaLanguageCode): LanguageCode {
    switch (value) {
      case PrismaLanguageCode.EN:
        return LanguageCode.EN;
      case PrismaLanguageCode.ES:
        return LanguageCode.ES;
      case PrismaLanguageCode.FR:
        return LanguageCode.FR;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled language code: ${value}`);
      }
    }
  }

  static toPrismaDifficulty(value: WordDifficulty): PrismaWordDifficulty {
    switch (value) {
      case WordDifficulty.BEGINNER:
      case WordDifficulty.INTERMEDIATE:
      case WordDifficulty.ADVANCED:
        return value;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled difficulty: ${value}`);
      }
    }
  }

  static toDomainPartOfSpeech(value: PrismaPartOfSpeech): PartOfSpeech {
    switch (value) {
      case 'NOUN':
      case 'VERB':
      case 'ADJECTIVE':
      case 'ADVERB':
      case 'EXPRESSION':
      case 'OTHER':
        return value as PartOfSpeech;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled part of speech: ${value}`);
      }
    }
  }

  static toPrismaPartOfSpeech(value: PartOfSpeech): PrismaPartOfSpeech {
    switch (value) {
      case PartOfSpeech.NOUN:
      case PartOfSpeech.VERB:
      case PartOfSpeech.ADJECTIVE:
      case PartOfSpeech.ADVERB:
      case PartOfSpeech.EXPRESSION:
      case PartOfSpeech.OTHER:
        return value;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled part of speech: ${value}`);
      }
    }
  }

  static toDomainStatus(
    value: PrismaVocabularyWordStatus,
  ): VocabularyWordStatus {
    switch (value) {
      case 'DRAFT':
      case 'PUBLISHED':
      case 'ARCHIVED':
        return value as VocabularyWordStatus;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled status: ${value}`);
      }
    }
  }

  static toPrismaStatus(
    value: VocabularyWordStatus,
  ): PrismaVocabularyWordStatus {
    switch (value) {
      case VocabularyWordStatus.DRAFT:
      case VocabularyWordStatus.PUBLISHED:
      case VocabularyWordStatus.ARCHIVED:
        return value;
      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled status: ${value}`);
      }
    }
  }

  static toDomainWord(word: PrismaVocabularyWord): VocabularyWord {
    return {
      id: word.id,
      term: word.term,
      normalizedTerm: word.normalizedTerm,
      targetLanguage: word.targetLanguage as LanguageCode,
      difficulty: this.toDomainDifficulty(word.difficulty),
      partOfSpeech: this.toDomainPartOfSpeech(word.partOfSpeech),
      status: this.toDomainStatus(word.status),
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
    };
  }

  static toDomainDefinition(definition: PrismaWordDefinition): WordDefinition {
    return {
      id: definition.id,
      wordId: definition.wordId,
      explanationLanguage: definition.explanationLanguage as LanguageCode,
      text: definition.text,
      register: definition.register,
      createdAt: definition.createdAt,
    };
  }

  static toDomainExample(example: PrismaWordExample): WordExample {
    return {
      id: example.id,
      wordId: example.wordId,
      sentence: example.sentence,
      translation: example.translation,
      translationLanguage: example.translationLanguage as LanguageCode | null,
      createdAt: example.createdAt,
    };
  }

  static toDomainPronunciation(
    pronunciation: PrismaWordPronunciation,
  ): WordPronunciation {
    return {
      id: pronunciation.id,
      wordId: pronunciation.wordId,
      phonetic: pronunciation.phonetic,
      audioUrl: pronunciation.audioUrl,
      provider: pronunciation.provider,
      createdAt: pronunciation.createdAt,
    };
  }

  static toDomainSynonym(synonym: PrismaWordSynonym): WordSynonym {
    return {
      id: synonym.id,
      wordId: synonym.wordId,
      value: synonym.value,
      createdAt: synonym.createdAt,
    };
  }

  static toDomainAggregate(data: {
    word: PrismaVocabularyWord;
    definitions: PrismaWordDefinition[];
    examples: PrismaWordExample[];
    pronunciations: PrismaWordPronunciation[];
    synonyms: PrismaWordSynonym[];
  }): VocabularyWordAggregate {
    return {
      word: this.toDomainWord(data.word),
      definitions: data.definitions.map((d) => this.toDomainDefinition(d)),
      examples: data.examples.map((e) => this.toDomainExample(e)),
      pronunciations: data.pronunciations.map((p) =>
        this.toDomainPronunciation(p),
      ),
      synonyms: data.synonyms.map((s) => this.toDomainSynonym(s)),
    };
  }
}
