import {
  ActivityDetailWord,
  CreateDailyAssignmentParams,
  FindRandomWordParams,
  FindReviewQueueParams,
  FindTodayAssignmentParams,
  FindUserActivityDetailParams,
  FindUserDailyActivityParams,
  FindUserWordLibraryParams,
  FindUserWordProgressParams,
  LearningRepository,
  RandomWord,
  RecordWordReviewEventParams,
  RescheduleUserWordReviewParams,
  ReviewQueueItem,
  TodayWordAssignment,
  UpdateUserWordReviewParams,
  UpsertUserLearningStreakParams,
  UserActivityDetail,
  UserDailyActivity,
  UserLearningStats,
  UserWordLibraryResult,
} from '../../domain/repositories/learning.repository';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaVocabularyMapper } from '../../../vocabulary/infrastructure/persistence/prisma-vocabulary.mapper';
import {
  UserWordProgress,
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../../domain/entities/user-word-progress';
import { PrismaLearningMapper } from './prisma-learning.mapper';
import { UserLearningStreak } from '../../domain/entities/user-learning-streak';
import { FavoriteWord } from '../../domain/entities/favorite-word';
import { instantToLocalDate } from '../../domain/services/local-date';

@Injectable()
export class PrismaLearningRepository implements LearningRepository {
  private readonly logger = new Logger(PrismaLearningRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findUserFavoriteWords(userId: string): Promise<FavoriteWord[]> {
    const favorites = await this.prisma.favoriteWord.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        word: true, // Include the related word entity
      },
    });

    return favorites.map((favorite) => ({
      id: favorite.id,
      userId: favorite.userId,
      term: favorite.word.term, // Access the term from the related word entity
      normalizedTerm: favorite.word.normalizedTerm, // Access the normalizedTerm from the related word entity
      wordId: favorite.wordId,
      createdAt: favorite.createdAt,
    }));
  }

  async addUserFavoriteWord(
    userId: string,
    wordId: string,
  ): Promise<FavoriteWord> {
    const favorite = await this.prisma.favoriteWord.upsert({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      update: {},
      create: {
        userId,
        wordId,
      },
      include: {
        word: true, // Include the related word entity
      },
    });

    return {
      id: favorite.id,
      term: favorite.word.term, // Access the term from the related word entity
      normalizedTerm: favorite.word.normalizedTerm, // Access the normalizedTerm from the related word entity
      userId: favorite.userId,
      wordId: favorite.wordId,
      createdAt: favorite.createdAt,
    };
  }

  async removeUserFavoriteWord(
    userId: string,
    wordId: string,
  ): Promise<boolean> {
    const result = await this.prisma.favoriteWord.deleteMany({
      where: { userId, wordId },
    });

    return result.count > 0;
  }

  async findUserWordLibrary(
    params: FindUserWordLibraryParams,
  ): Promise<UserWordLibraryResult> {
    const { userId, status, search, limit, cursor } = params;

    // Whole-library aggregates for the header and the filter chips'
    // counts — deliberately unfiltered, so they never change as the
    // user searches or filters.
    const [grouped, aggregate, items] = await Promise.all([
      this.prisma.userWordProgress.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
      this.prisma.userWordProgress.aggregate({
        where: { userId },
        _avg: { masteryLevel: true },
        _count: { id: true },
      }),
      this.prisma.userWordProgress.findMany({
        where: {
          userId,
          ...(status ? { status } : {}),
          ...(search
            ? {
                word: {
                  OR: [
                    { term: { contains: search, mode: 'insensitive' } },
                    {
                      normalizedTerm: {
                        contains: search.toLowerCase(),
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              }
            : {}),
        },
        include: {
          word: {
            include: {
              definitions: {
                select: { id: true, text: true, explanationLanguage: true },
                orderBy: { createdAt: 'asc' },
              },
              pronunciations: true,
            },
          },
        },
        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      }),
    ]);

    const hasNextPage = items.length > limit;
    const pageItems = hasNextPage ? items.slice(0, limit) : items;

    const countOf = (wanted: string) =>
      grouped.find((group) => group.status === wanted)?._count.status ?? 0;

    return {
      summary: {
        total: aggregate._count.id,
        averageMastery: Math.round(aggregate._avg.masteryLevel ?? 0),
        statusCounts: {
          [UserWordProgressStatus.NEW]: countOf('NEW'),
          [UserWordProgressStatus.SEEN]: countOf('SEEN'),
          [UserWordProgressStatus.LEARNING]: countOf('LEARNING'),
          [UserWordProgressStatus.MASTERED]: countOf('MASTERED'),
          [UserWordProgressStatus.SKIPPED]: countOf('SKIPPED'),
        },
      },
      items: pageItems.map((item) => ({
        progressId: item.id,
        wordId: item.wordId,
        term: item.word.term,
        normalizedTerm: item.word.normalizedTerm,
        targetLanguage: item.word.targetLanguage,
        status: PrismaLearningMapper.toDomainUserWordProgressStatus(
          item.status,
        ),
        masteryLevel: item.masteryLevel,
        reviewCount: item.reviewCount,
        lastReviewedAt: item.lastReviewedAt,
        nextReviewOn: item.nextReviewOn,
        updatedAt: item.updatedAt,
        definitions: item.word.definitions.map((definition) => ({
          id: definition.id,
          text: definition.text,
          explanationLanguage: definition.explanationLanguage,
        })),
        pronunciations: item.word.pronunciations.map((pronunciation) => ({
          id: pronunciation.id,
          wordId: pronunciation.wordId,
          phonetic: pronunciation.phonetic,
          provider: pronunciation.provider,
          audioUrl: pronunciation.audioUrl,
          createdAt: pronunciation.createdAt,
        })),
      })),
      nextCursor: hasNextPage ? pageItems[pageItems.length - 1].id : null,
    };
  }

  async findUserLearningStats(userId: string): Promise<UserLearningStats> {
    const grouped = await this.prisma.userWordProgress.groupBy({
      by: ['status'],
      where: {
        userId,
      },
      _count: {
        status: true,
      },
    });

    return {
      seen: grouped.find((item) => item.status === 'SEEN')?._count.status ?? 0,
      learning:
        grouped.find((item) => item.status === 'LEARNING')?._count.status ?? 0,
      mastered:
        grouped.find((item) => item.status === 'MASTERED')?._count.status ?? 0,
      skipped:
        grouped.find((item) => item.status === 'SKIPPED')?._count.status ?? 0,
      total: grouped.reduce((acc, item) => acc + item._count.status, 0),
    };
  }

  async recordWordReviewEvent(
    params: RecordWordReviewEventParams,
  ): Promise<void> {
    await this.prisma.userWordReviewEvent.create({
      data: {
        userId: params.userId,
        wordId: params.wordId,
        correct: params.correct,
        localDate: params.localDate,
      },
    });
  }

  async findUserDailyActivity(
    params: FindUserDailyActivityParams,
  ): Promise<UserDailyActivity[]> {
    // The day was decided when the review was recorded, so reading it back
    // is a string range and a group — no offsets, no instant arithmetic,
    // nothing to get wrong at a DST boundary.
    const grouped = await this.prisma.userWordReviewEvent.groupBy({
      by: ['localDate', 'correct'],
      where: {
        userId: params.userId,
        localDate: { gte: params.from, lte: params.to },
      },
      _count: { _all: true },
      orderBy: { localDate: 'asc' },
    });

    this.logger.debug('Grouped daily activity', { grouped });

    // Two rows per active day at most (correct true/false); fold them.
    const byDate = new Map<string, UserDailyActivity>();
    for (const row of grouped) {
      const day = byDate.get(row.localDate) ?? {
        date: row.localDate,
        reviewCount: 0,
        correctCount: 0,
      };
      day.reviewCount += row._count._all;
      if (row.correct) {
        day.correctCount += row._count._all;
      }
      byDate.set(row.localDate, day);
    }

    this.logger.debug('Folded daily activity', { byDate });

    return [...byDate.values()];
  }

  async findUserActivityDetail(
    params: FindUserActivityDetailParams,
  ): Promise<UserActivityDetail> {
    const range = { gte: params.from, lte: params.to };

    // Per-word tallies plus the totals; independent, so run them together.
    const [byWord, totals] = await Promise.all([
      this.prisma.userWordReviewEvent.groupBy({
        by: ['wordId'],
        where: { userId: params.userId, localDate: range },
        _count: { wordId: true },
        orderBy: { _count: { wordId: 'desc' } },
      }),
      this.prisma.userWordReviewEvent.aggregate({
        where: { userId: params.userId, localDate: range },
        _count: { id: true },
      }),
    ]);

    this.logger.debug('Grouped activity detail', { byWord, totals });

    const correctCount = await this.prisma.userWordReviewEvent.count({
      where: { userId: params.userId, localDate: range, correct: true },
    });

    const topWordIds = byWord.slice(0, params.limit).map((row) => row.wordId);

    // Terms live on the vocabulary word; mastery is per user, so both are
    // read through the progress row.
    const progresses = topWordIds.length
      ? await this.prisma.userWordProgress.findMany({
          where: { userId: params.userId, wordId: { in: topWordIds } },
          select: {
            wordId: true,
            masteryLevel: true,
            word: { select: { term: true } },
          },
        })
      : [];

    const progressByWordId = new Map(
      progresses.map((progress) => [progress.wordId, progress]),
    );

    // Rebuilt from topWordIds so the busiest-first order survives the
    // unordered findMany.
    const words: ActivityDetailWord[] = [];
    for (const row of byWord.slice(0, params.limit)) {
      const progress = progressByWordId.get(row.wordId);
      if (!progress) continue;
      words.push({
        wordId: row.wordId,
        term: progress.word.term,
        masteryLevel: progress.masteryLevel,
        reviewCount: row._count.wordId,
      });
    }

    return {
      reviewCount: totals._count.id,
      correctCount,
      distinctWordCount: byWord.length,
      words,
      hasMoreWords: byWord.length > params.limit,
    };
  }

  async findUserLearningStreak(
    userId: string,
  ): Promise<UserLearningStreak | null> {
    const found = await this.prisma.userLearningStreak.findUnique({
      where: {
        userId,
      },
    });

    if (!found) {
      return null;
    }
    return {
      id: found.id,
      lastActivityLocalDate: found.lastActivityLocalDate,
      userId: found.userId,
      currentStreak: found.currentStreak,
      longestStreak: found.longestStreak,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }
  async upsertUserLearningStreak(
    params: UpsertUserLearningStreakParams,
  ): Promise<UserLearningStreak> {
    const { userId, currentStreak, longestStreak, lastActivityLocalDate } =
      params;

    const upserted = await this.prisma.userLearningStreak.upsert({
      where: { userId },
      update: {
        currentStreak,
        longestStreak,
        lastActivityLocalDate,
      },
      create: {
        userId,
        currentStreak,
        longestStreak,
        lastActivityLocalDate,
      },
    });

    return {
      id: upserted.id,
      lastActivityLocalDate: upserted.lastActivityLocalDate,
      userId: upserted.userId,
      currentStreak: upserted.currentStreak,
      longestStreak: upserted.longestStreak,
      createdAt: upserted.createdAt,
      updatedAt: upserted.updatedAt,
    };
  }
  async updateUserWordReview(
    params: UpdateUserWordReviewParams,
  ): Promise<UserWordProgress> {
    const updated = await this.prisma.userWordProgress.update({
      where: {
        userId_wordId: {
          userId: params.userId,
          wordId: params.wordId,
        },
      },
      data: {
        status: PrismaLearningMapper.toPrismaUserWordProgressStatus(
          params.status,
        ),
        masteryLevel: params.masteryLevel,
        reviewCount: params.reviewCount,
        lastReviewedAt: params.lastReviewedAt,
        nextReviewOn: params.nextReviewOn,
      },
    });

    return {
      ...updated,
      status: PrismaLearningMapper.toDomainUserWordProgressStatus(
        updated.status,
      ),
    };
  }

  async rescheduleUserWordReview(
    params: RescheduleUserWordReviewParams,
  ): Promise<UserWordProgress> {
    // `lastReviewedAt` and `reviewCount` are left alone on purpose: the
    // learner moved a date, they did not review anything.
    const updated = await this.prisma.userWordProgress.update({
      where: {
        userId_wordId: {
          userId: params.userId,
          wordId: params.wordId,
        },
      },
      data: {
        status: PrismaLearningMapper.toPrismaUserWordProgressStatus(
          params.status,
        ),
        masteryLevel: params.masteryLevel,
        nextReviewOn: params.nextReviewOn,
      },
    });

    return {
      ...updated,
      status: PrismaLearningMapper.toDomainUserWordProgressStatus(
        updated.status,
      ),
    };
  }

  async findReviewQueue(
    params: FindReviewQueueParams,
  ): Promise<ReviewQueueItem[]> {
    const { userId, localDate, limit } = params;

    this.logger.log('Finding review queue', { userId, localDate, limit });

    const items = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        // A word is due either because it has never been practised (just
        // discovered, so no review is scheduled yet) or because its
        // scheduled review has come around. MASTERED and SKIPPED are
        // excluded by the status filter, so a null nextReviewOn here can
        // only mean "discovered, not yet practised".
        status: {
          in: [UserWordProgressStatus.SEEN, UserWordProgressStatus.LEARNING],
        },
        OR: [{ nextReviewOn: null }, { nextReviewOn: { lte: localDate } }],
      },
      take: limit,
      orderBy: [{ nextReviewOn: 'asc' }, { masteryLevel: 'asc' }],
      include: {
        word: {
          include: {
            examples: true,
            definitions: true,
            pronunciations: true,
            synonyms: true,
          },
        },
      },
    });

    return items.map((item) => ({
      progressId: item.id,
      wordId: item.wordId,
      term: item.word.term,
      masteryLevel: item.masteryLevel,
      reviewCount: item.reviewCount,
      status: PrismaLearningMapper.toDomainUserWordProgressStatus(item.status),
      nextReviewOn: item.nextReviewOn,
      partOfSpeech: PrismaVocabularyMapper.toDomainPartOfSpeech(
        item.word.partOfSpeech,
      ),
      targetLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
        item.word.targetLanguage,
      ),
      definitions: item.word.definitions.map(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        PrismaVocabularyMapper.toDomainDefinition,
      ),
      examples: item.word.examples.map(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        PrismaVocabularyMapper.toDomainExample,
      ),
      pronunciations: item.word.pronunciations.map(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        PrismaVocabularyMapper.toDomainPronunciation,
      ),
      synonyms: item.word.synonyms.map(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        PrismaVocabularyMapper.toDomainSynonym,
      ),
    }));
  }

  async findUserWordProgress(
    params: FindUserWordProgressParams,
  ): Promise<UserWordProgress | null> {
    const { userId, wordId } = params;
    const found = await this.prisma.userWordProgress.findFirst({
      where: { userId, wordId },
    });

    if (!found) {
      return null;
    }

    return {
      ...found,
      status: PrismaLearningMapper.toDomainUserWordProgressStatus(found.status),
    };
  }
  async setUserWordProgressStatus(params: {
    userId: string;
    wordId: string;
    status: UserWordProgressStatus;
    masteryLevel: UserWordProgressMasteryLevel;
    seenAt?: Date | null;
    nextReviewOn?: string | null;
  }): Promise<UserWordProgress> {
    const { userId, wordId, status } = params;
    const found = await this.prisma.userWordProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: {
        status: PrismaLearningMapper.toPrismaUserWordProgressStatus(status),
        masteryLevel: params.masteryLevel,
        seenAt: params.seenAt,
        nextReviewOn: params.nextReviewOn,
      },
      create: {
        userId,
        wordId,
        status: PrismaLearningMapper.toPrismaUserWordProgressStatus(status),
        // The first transition must persist the computed state too,
        // not just the status — otherwise a fresh word lands at
        // mastery 0 with no seenAt regardless of the state machine.
        masteryLevel: params.masteryLevel,
        seenAt: params.seenAt,
        nextReviewOn: params.nextReviewOn,
      },
    });

    return {
      ...found,
      status: PrismaLearningMapper.toDomainUserWordProgressStatus(found.status),
    };
  }

  async createDailyAssignment(
    params: CreateDailyAssignmentParams,
  ): Promise<TodayWordAssignment> {
    const { userId, userLearningProfileId, wordId, assignedFor } = params;

    const created = await this.prisma.dailyWordAssignment.create({
      data: {
        userId,
        userLearningProfileId,
        wordId,
        assignedFor,
      },
      include: {
        word: {
          include: {
            examples: true,
            definitions: true,
            pronunciations: true,
            synonyms: true,
            themes: {
              include: {
                theme: true,
              },
            },
          },
        },
      },
    });

    return {
      assignedFor: instantToLocalDate(created.assignedFor),
      assignmentId: created.id,
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: created.word,
        definitions: created.word.definitions,
        examples: created.word.examples,
        pronunciations: created.word.pronunciations,
        synonyms: created.word.synonyms,
        themes: created.word.themes.map((t) => t.theme),
      }),
    };
  }

  /**
   * Words matching `where`, with the theme slugs the caller needs.
   *
   * Split out so the daily-word search can be run twice — once at the
   * user's level, once without it — without restating the query.
   */
  async findCandidateWord(
    profile: UserLearningProfile,
  ): Promise<VocabularyWord | null> {
    const { themeSlugs, targetLanguage, difficulty } = profile;

    const baseWhere: Prisma.VocabularyWordWhereInput = {
      themes: { some: { theme: { slug: { in: themeSlugs } } } },
      targetLanguage,

      // No status filter — same reason as findRandomWord: the corpus
      // is all DRAFT for now, so filtering would leave no daily word.

      dailyWordAssignments: {
        none: {
          userId: profile.userId,
        },
      },
    };

    // Difficulty is a preference, not a requirement.
    //
    // Narrowing five topics by language *and* level can easily leave an
    // empty pool — and an empty pool here means the user simply has no
    // word today, which is a far worse outcome than a word one level
    // off. So try their level first, then widen.
    if (difficulty) {
      const preferred = await this.pickRandomWord({ ...baseWhere, difficulty });
      if (preferred) return preferred;
    }

    return this.pickRandomWord(baseWhere);
  }

  /**
   * One word, chosen uniformly, without reading the pool.
   *
   * `count` then an offset, rather than fetching every match and picking
   * in Node: this runs once per user per day, and the pool is every word
   * in their language and topics. The rows were transferred only to be
   * discarded — and with them a themes join nothing ever read.
   */
  private async pickRandomWord(
    where: Prisma.VocabularyWordWhereInput,
  ): Promise<VocabularyWord | null> {
    const total = await this.prisma.vocabularyWord.count({ where });
    if (total === 0) return null;

    const [word] = await this.prisma.vocabularyWord.findMany({
      where,
      skip: Math.floor(Math.random() * total),
      take: 1,
    });

    if (!word) return null;

    return {
      id: word.id,
      term: word.term,
      normalizedTerm: word.normalizedTerm,
      targetLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
        word.targetLanguage,
      ),
      difficulty: PrismaVocabularyMapper.toDomainDifficulty(word.difficulty),
      partOfSpeech: PrismaVocabularyMapper.toDomainPartOfSpeech(
        word.partOfSpeech,
      ),
      status: PrismaVocabularyMapper.toDomainStatus(word.status),
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
    };
  }

  // Find today's assignment for a user
  // This method retrieves the daily word assignment for a specific user on a given date.
  async findTodayAssignment(
    params: FindTodayAssignmentParams,
  ): Promise<TodayWordAssignment | null> {
    const { userId, assignedFor } = params;

    const today = new Date(assignedFor);

    const found = await this.prisma.dailyWordAssignment.findFirst({
      where: {
        userId,
        assignedFor: {
          equals: today,
        },
      },
      include: {
        word: {
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
        },
      },
    });

    if (!found) {
      return null;
    }

    return {
      assignedFor: instantToLocalDate(found.assignedFor),
      assignmentId: found.id,
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: found.word,
        definitions: found.word.definitions,
        examples: found.word.examples,
        pronunciations: found.word.pronunciations,
        synonyms: found.word.synonyms,
        themes: found.word.themes.map((t) => t.theme),
      }),
    };
  }

  async findRandomWord(
    params: FindRandomWordParams,
  ): Promise<RandomWord | null> {
    const { themes, targetLanguage, difficulty } = params;

    const where = {
      // No status filter on purpose: the seeded corpus is entirely
      // DRAFT today, so requiring PUBLISHED would return nothing and
      // leave the welcome screen with no word. Add it once ingestion
      // starts publishing.
      ...(themes?.length
        ? { themes: { some: { theme: { slug: { in: themes } } } } }
        : {}),
      ...(targetLanguage ? { targetLanguage } : {}),
      ...(difficulty ? { difficulty } : {}),
    };

    // Count then skip, rather than loading every match and picking in
    // memory: this endpoint is public and uncached, and the whole
    // vocabulary with all its relations is not something to pull on
    // every request.
    const count = await this.prisma.vocabularyWord.count({ where });

    if (count === 0) {
      return null;
    }

    // `findFirst`, not `findFirstOrThrow`: rows can disappear between
    // the count and the read, and an empty page beats a 500.
    const randomWord = await this.prisma.vocabularyWord.findFirst({
      where,
      skip: Math.floor(Math.random() * count),
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

    if (!randomWord) {
      return null;
    }

    return {
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: randomWord,
        definitions: randomWord.definitions,
        examples: randomWord.examples,
        pronunciations: randomWord.pronunciations,
        synonyms: randomWord.synonyms,
        themes: randomWord.themes.map((t) => t.theme),
      }),
    };
  }
}
