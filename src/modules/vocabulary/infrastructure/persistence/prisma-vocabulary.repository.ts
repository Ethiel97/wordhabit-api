import {
  FindVocabularyWordParams,
  ListVocabularyWordsParams,
  VocabularyRepository,
  VocabularyWordAggregate,
  VocabularyWordListItemProjection,
} from '../../domain/repositories/vocabulary.repository';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { VocabularyWord } from '../../domain/entities/vocabulary-word';
import { PrismaVocabularyMapper } from './prisma-vocabulary.mapper';
import { Injectable } from '@nestjs/common';
import { LanguageCode } from '../../domain/entities/language-code';
import { PaginatedResult } from 'src/shared/application/pagination/paginated-result';
import { Prisma } from '../../../../../generated/prisma/client';
import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';

@Injectable()
export class PrismaVocabularyRepository implements VocabularyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listWords(
    params: ListVocabularyWordsParams,
  ): Promise<PaginatedResult<VocabularyWordListItemProjection>> {
    const page = params.page;
    const pageSize = params.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.VocabularyWordWhereInput = {
      ...(params.targetLanguage
        ? { targetLanguage: params.targetLanguage }
        : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params.partOfSpeech ? { partOfSpeech: params.partOfSpeech } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              {
                term: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                normalizedTerm: {
                  contains: params.search.toLowerCase(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vocabularyWord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.vocabularyWord.count({
        where,
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        term: item.term,
        normalizedTerm: item.normalizedTerm,
        targetLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
          item.targetLanguage,
        ),
        difficulty: PrismaVocabularyMapper.toDomainDifficulty(item.difficulty),
        partOfSpeech: PrismaVocabularyMapper.toDomainPartOfSpeech(
          item.partOfSpeech,
        ),
        status: PrismaVocabularyMapper.toDomainStatus(item.status),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  async findWordByNormalizedTerm(
    params: FindVocabularyWordParams,
  ): Promise<VocabularyWordAggregate | null> {
    const aggregate = await this.prisma.vocabularyWord.findUnique({
      where: {
        normalizedTerm_targetLanguage: {
          normalizedTerm: params.normalizedTerm,
          targetLanguage: PrismaVocabularyMapper.toPrismaLanguageCode(
            params.targetLanguage ?? this.getDefaultLanguage(),
          ),
        },
      },
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
        themes: true,
      },
    });

    if (!aggregate) {
      return null;
    }

    return {
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: aggregate,
        definitions: aggregate.definitions,
        examples: aggregate.examples,
        pronunciations: aggregate.pronunciations,
        synonyms: aggregate.synonyms,
      }),
      // themes: aggregate.themes.map((t) => t.theme.slug),
    };
  }
  async findWordById(wordId: string): Promise<VocabularyWordAggregate | null> {
    const aggregate = await this.prisma.vocabularyWord.findUnique({
      where: {
        id: wordId,
      },
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    if (!aggregate) {
      return null;
    }

    return {
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: aggregate,
        definitions: aggregate.definitions,
        examples: aggregate.examples,
        pronunciations: aggregate.pronunciations,
        synonyms: aggregate.synonyms,
      }),
      themes: aggregate.themes.map((t) => t.theme.slug),
    };
  }

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
    themeSlugs: string[];
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
        themes: {
          create: params.themeSlugs.map((slug) => ({
            theme: {
              connect: { slug },
            },
          })),
        },
      },
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    return PrismaVocabularyMapper.toDomainAggregate({
      definitions: created.definitions,
      examples: created.examples,
      pronunciations: created.pronunciations,
      synonyms: created.synonyms,
      word: created,
      //TODO: map to PrismaTheme
      // themes: created.themes,
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
            params.targetLanguage ?? this.getDefaultLanguage(),
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

  // TODO: Make this configurable
  private getDefaultLanguage(): LanguageCode {
    return LanguageCode.EN;
  }
}
