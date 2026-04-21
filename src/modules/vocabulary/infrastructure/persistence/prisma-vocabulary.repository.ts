import {
  FindVocabularyWordParams,
  VocabularyRepository,
  VocabularyWordAggregate,
} from '../../domain/repositories/vocabulary.repository';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { VocabularyWord } from '../../domain/entities/vocabulary-word';
import { PrismaVocabularyMapper } from './prisma-vocabulary.mapper';
import { Injectable } from '@nestjs/common';
import { LanguageCode } from '../../domain/entities/language-code';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';
import { WordDifficulty } from '../../domain/entities/word-difficulty';

@Injectable()
export class PrismaVocabularyRepository implements VocabularyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWord(params: {
    term: string;
    normalizedTerm: string;
    targetLanguage: LanguageCode;
    difficulty: WordDifficulty;
    partOfSpeech: PartOfSpeech;
    definitions: {
      explanationLanguage: LanguageCode;
      text: string;
      register: string | null;
    }[];
    examples: {
      sentence: string;
      translation: string | null;
      translationLanguage: string | null;
    }[];
    pronunciations: {
      phonetic: string | null;
      audioUrl: string | null;
      provider: string | null;
    }[];
    synonyms: { value: string }[];
  }): Promise<VocabularyWordAggregate> {
    const created = await this.prisma.vocabularyWord.create({
      data: {
        term: params.term,
        normalizedTerm: params.normalizedTerm,
        targetLanguage: params.targetLanguage,
        difficulty: params.difficulty,
        partOfSpeech: params.partOfSpeech,
        definitions: {
          createMany: {
            data: params.definitions.map((def) => ({
              explanationLanguage: def.explanationLanguage,
              text: def.text,
              register: def.register ?? null,
            })),
          },
        },
        examples: {
          createMany: {
            data: params.examples.map((ex) => ({
              sentence: ex.sentence,
              translation: ex.translation ?? null,
              translationLanguage:
                (ex.translationLanguage as LanguageCode) ?? null,
            })),
          },
        },
        pronunciations: {
          createMany: {
            data: params.pronunciations.map((pr) => ({
              phonetic: pr.phonetic ?? null,
              audioUrl: pr.audioUrl ?? null,
              provider: pr.provider ?? null,
            })),
          },
        },
        synonyms: {
          createMany: {
            data: params.synonyms.map((syn) => ({
              value: syn.value,
            })),
          },
        },
      },
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
      },
    });

    return PrismaVocabularyMapper.toDomainAggregate({
      definitions: created.definitions,
      examples: created.examples,
      pronunciations: created.pronunciations,
      synonyms: created.synonyms,
      word: created,
    });
  }

  async findByNormalizedTerm(
    params: FindVocabularyWordParams,
  ): Promise<VocabularyWord | null> {
    const found = await this.prisma.vocabularyWord.findUnique({
      where: {
        normalizedTerm_targetLanguage: {
          normalizedTerm: params.normalizedTerm,
          targetLanguage: PrismaVocabularyMapper.toPrismaLanguageCode(
            params.targetLanguage,
          ),
        },
      },
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
      },
    });

    if (!found) {
      return null;
    }

    return {
      normalizedTerm: found.normalizedTerm,
      targetLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
        found.targetLanguage,
      ),
      difficulty: PrismaVocabularyMapper.toDomainDifficulty(found.difficulty),
      partOfSpeech: PrismaVocabularyMapper.toDomainPartOfSpeech(
        found.partOfSpeech,
      ),
      status: PrismaVocabularyMapper.toDomainStatus(found.status),
      createdAt: found.createdAt,
      id: found.id,
      term: found.term,
      updatedAt: found.updatedAt,
    };
  }
}
