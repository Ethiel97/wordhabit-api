import {
  FindVocabularyWordParams,
  ListVocabularyWordsParams,
  QuizBackfillWord,
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

  countWords(params: { targetLanguage: LanguageCode }): Promise<number> {
    return this.prisma.vocabularyWord.count({
      where: {
        targetLanguage: PrismaVocabularyMapper.toPrismaLanguageCode(
          params.targetLanguage,
        ),
      },
    });
  }

  async sampleNormalizedTerms(params: {
    targetLanguage: LanguageCode;
    limit: number;
  }): Promise<string[]> {
    // Raw SQL: Prisma has no ORDER BY RANDOM(). Counting then
    // offsetting costs two round trips and skews as rows are added.
    const rows = await this.prisma.$queryRaw<{ normalizedTerm: string }[]>`
      SELECT "normalizedTerm"
      FROM "vocabulary_words"
      WHERE "targetLanguage" = CAST(${params.targetLanguage} AS "LanguageCode")
      ORDER BY RANDOM()
      LIMIT ${params.limit}
    `;

    return rows.map((row) => row.normalizedTerm);
  }

  /**
   * Catch-all buckets, excluded from the "generate more of this" list:
   * steering a batch towards them asks for nothing in particular.
   */
  private static readonly CATCH_ALL_THEME_SLUGS = ['general', 'other'];

  async findLeastCoveredThemes(params: {
    targetLanguage: LanguageCode;
    limit: number;
  }): Promise<string[]> {
    // LEFT JOIN so an empty theme counts zero and comes first. The
    // language filter sits in the join condition: in WHERE it would turn
    // the outer join back into an inner one.
    const rows = await this.prisma.$queryRaw<{ slug: string }[]>`
      SELECT t."slug", COUNT(w."id") AS word_count
      FROM "themes" t
      LEFT JOIN "vocabulary_word_themes" wt ON wt."themeId" = t."id"
      LEFT JOIN "vocabulary_words" w
        ON w."id" = wt."wordId"
       AND w."targetLanguage" = CAST(${params.targetLanguage} AS "LanguageCode")
      WHERE t."slug" NOT IN (${Prisma.join(PrismaVocabularyRepository.CATCH_ALL_THEME_SLUGS)})
      GROUP BY t."slug"
      ORDER BY word_count ASC, t."slug" ASC
      LIMIT ${params.limit}
    `;

    return rows.map((row) => row.slug);
  }

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
  async search(
    params: FindVocabularyWordParams,
  ): Promise<VocabularyWordAggregate[]> {
    const words = await this.prisma.vocabularyWord.findMany({
      where: {
        ...(params.normalizedTerm
          ? {
              normalizedTerm: {
                contains: params.normalizedTerm,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(params.difficulty ? { difficulty: params.difficulty } : {}),
        ...(params.targetLanguage
          ? { targetLanguage: params.targetLanguage }
          : {}),
        ...(params.theme
          ? {
              themes: {
                some: {
                  theme: {
                    OR: [
                      {
                        slug: params.theme,
                      },
                      {
                        name: {
                          contains: params.theme,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {}),
      },
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
        antonyms: true,
        themes: {
          include: {
            theme: true,
          },
        },
      },
      take: 20,
      orderBy: {
        term: 'asc',
      },
    });

    return words.map((word) =>
      PrismaVocabularyMapper.toDomainAggregate({
        word,
        definitions: word.definitions,
        examples: word.examples,
        pronunciations: word.pronunciations,
        synonyms: word.synonyms,
        antonyms: word.antonyms,
        themes: word.themes.map((t) => t.theme),
      }),
    );
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
        antonyms: true,
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
        antonyms: aggregate.antonyms,
      }),
      themes: aggregate.themes.map((t) => t.theme.slug),
    };
  }

  async findWordsMissingQuizScenarios(params: {
    limit: number;
  }): Promise<QuizBackfillWord[]> {
    const words = await this.prisma.vocabularyWord.findMany({
      where: { quizScenarios: { none: {} } },
      orderBy: { createdAt: 'asc' },
      take: params.limit,
      include: {
        definitions: {
          select: { explanationLanguage: true, text: true },
        },
        examples: { select: { sentence: true } },
      },
    });

    return words.map((word) => ({
      wordId: word.id,
      term: word.term,
      targetLanguage: word.targetLanguage as LanguageCode,
      partOfSpeech: word.partOfSpeech as PartOfSpeech,
      difficulty: word.difficulty as WordDifficulty,
      definitions: word.definitions.map((def) => ({
        explanationLanguage: def.explanationLanguage as LanguageCode,
        text: def.text,
      })),
      examples: word.examples.map((ex) => ({ sentence: ex.sentence })),
    }));
  }

  async findWordsMissingDefinition(params: {
    targetLanguage: LanguageCode;
    explanationLanguage: LanguageCode;
    limit: number;
  }): Promise<QuizBackfillWord[]> {
    const words = await this.prisma.vocabularyWord.findMany({
      where: {
        targetLanguage: params.targetLanguage,
        definitions: {
          none: { explanationLanguage: params.explanationLanguage },
          // A word with no definition at all is broken in a way this
          // backfill cannot fix: there is no sense to write against.
          some: {},
        },
      },
      orderBy: { createdAt: 'asc' },
      take: params.limit,
      include: {
        definitions: {
          select: { explanationLanguage: true, text: true },
        },
        examples: { select: { sentence: true } },
      },
    });

    return words.map((word) => ({
      wordId: word.id,
      term: word.term,
      targetLanguage: word.targetLanguage as LanguageCode,
      partOfSpeech: word.partOfSpeech as PartOfSpeech,
      difficulty: word.difficulty as WordDifficulty,
      definitions: word.definitions.map((def) => ({
        explanationLanguage: def.explanationLanguage as LanguageCode,
        text: def.text,
      })),
      examples: word.examples.map((ex) => ({ sentence: ex.sentence })),
    }));
  }

  async attachDefinitions(params: {
    wordId: string;
    definitions: {
      explanationLanguage: LanguageCode;
      text: string;
      register?: string;
    }[];
  }): Promise<number> {
    const existing = await this.prisma.wordDefinition.findMany({
      where: { wordId: params.wordId },
      select: { explanationLanguage: true },
    });
    const held = new Set(existing.map((def) => def.explanationLanguage));

    const fresh = params.definitions.filter(
      (def) => !held.has(def.explanationLanguage),
    );
    if (fresh.length === 0) return 0;

    const { count } = await this.prisma.wordDefinition.createMany({
      data: fresh.map((def) => ({
        wordId: params.wordId,
        explanationLanguage: def.explanationLanguage,
        text: def.text,
        register: def.register ?? null,
      })),
    });

    return count;
  }

  async attachQuizMaterial(params: {
    wordId: string;
    antonyms: { value: string }[];
    quizScenarios: {
      language: LanguageCode;
      situation: string;
      question: string;
      correct: string;
      distractors: string[];
    }[];
  }): Promise<void> {
    await this.prisma.vocabularyWord.update({
      where: { id: params.wordId },
      data: {
        antonyms: {
          createMany: {
            data: params.antonyms.map((ant) => ({ value: ant.value })),
          },
        },
        quizScenarios: {
          createMany: {
            data: params.quizScenarios.map((scenario) => ({
              language: scenario.language,
              situation: scenario.situation,
              question: scenario.question,
              correct: scenario.correct,
              distractors: scenario.distractors,
            })),
          },
        },
      },
    });
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
    antonyms: { value: string }[];
    quizScenarios: {
      language: LanguageCode;
      situation: string;
      question: string;
      correct: string;
      distractors: string[];
    }[];
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
        antonyms: {
          createMany: {
            data: params.antonyms.map((ant) => ({
              value: ant.value,
            })),
          },
        },
        quizScenarios: {
          createMany: {
            data: params.quizScenarios.map((scenario) => ({
              language: scenario.language,
              situation: scenario.situation,
              question: scenario.question,
              correct: scenario.correct,
              distractors: scenario.distractors,
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
        antonyms: true,
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
      antonyms: created.antonyms,
      word: created,
      // TODO(Ethiel97): map to PrismaTheme.
      // themes: created.themes,
    });
  }

  async findByNormalizedTerm(params: {
    normalizedTerm: string;
    targetLanguage: LanguageCode;
  }): Promise<VocabularyWord | null> {
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
        antonyms: true,
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

  // TODO(Ethiel97): make this configurable.
  private getDefaultLanguage(): LanguageCode {
    return LanguageCode.EN;
  }
}
