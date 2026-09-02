import {
  ActivityDetailWord,
  CreateDailyAssignmentParams,
  EarnedBadge,
  FindRandomWordParams,
  FindReviewQueueParams,
  FindTodayAssignmentParams,
  FindUserActivityDetailParams,
  FindUserDailyActivityParams,
  FindUserLearningStatsParams,
  FindUserWordLibraryParams,
  FindUserWordProgressParams,
  LastWordReview,
  LearningRepository,
  ProfileDayState,
  ProfileWordCount,
  RandomWord,
  RecordWordReviewEventParams,
  RescheduleUserWordReviewParams,
  ReviewQueueItem,
  TodayWordAssignment,
  UpdateUserWordReviewParams,
  UpsertUserLearningStreakParams,
  RecordStreakRepairsParams,
  CountStreakRepairsInMonthParams,
  FindStreakRepairsParams,
  UserActivityDetail,
  UserDailyActivity,
  UserLearningStats,
  UserWordLibraryResult,
  ReviewXpFigures,
  XpWindowParams,
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
import { BadgeCode } from '../../domain/entities/badge';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import {
  FLUENT_MASTERY_LEVEL,
  LanguageMasteredWords,
  LearningBadgeFigures,
} from '../../domain/services/badge-catalog';

@Injectable()
export class PrismaLearningRepository implements LearningRepository {
  private readonly logger = new Logger(PrismaLearningRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findUserFavoriteWords(params: {
    userId: string;
    targetLanguage: LanguageCode;
  }): Promise<FavoriteWord[]> {
    const { userId, targetLanguage } = params;
    const favorites = await this.prisma.favoriteWord.findMany({
      where: { userId, word: { targetLanguage } },
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
    const { userId, targetLanguage, status, search, savedOnly, limit, cursor } =
      params;

    const ofLanguage = {
      userId,
      word: {
        targetLanguage:
          PrismaVocabularyMapper.toPrismaLanguageCode(targetLanguage),
      },
    };

    // Unfiltered on purpose, so the header and chip counts never move
    // as the user searches.
    const [grouped, aggregate, items] = await Promise.all([
      this.prisma.userWordProgress.groupBy({
        by: ['status'],
        where: ofLanguage,
        _count: { status: true },
      }),
      this.prisma.userWordProgress.aggregate({
        where: ofLanguage,
        _avg: { masteryLevel: true },
        _count: { id: true },
      }),
      this.prisma.userWordProgress.findMany({
        where: {
          ...ofLanguage,
          ...(status ? { status } : {}),
          // Nested inside `word` rather than beside it: a second `word`
          // key would replace the language filter, not add to it.
          word: {
            ...ofLanguage.word,
            // Same nesting rule as the search below: merged into the
            // one `word` filter, never added beside it.
            ...(savedOnly ? { favoriteWords: { some: { userId } } } : {}),
            ...(search
              ? {
                  OR: [
                    { term: { contains: search, mode: 'insensitive' } },
                    {
                      normalizedTerm: {
                        contains: search.toLowerCase(),
                        mode: 'insensitive',
                      },
                    },
                  ],
                }
              : {}),
          },
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
        targetLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
          item.word.targetLanguage,
        ),
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
          explanationLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
            definition.explanationLanguage,
          ),
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

  async findUserLearningStats(
    params: FindUserLearningStatsParams,
  ): Promise<UserLearningStats> {
    const grouped = await this.prisma.userWordProgress.groupBy({
      by: ['status'],
      where: {
        userId: params.userId,
        word: {
          targetLanguage: PrismaVocabularyMapper.toPrismaLanguageCode(
            params.targetLanguage,
          ),
        },
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

  async findLastWordReview(params: {
    userId: string;
    wordId: string;
  }): Promise<LastWordReview | null> {
    return this.prisma.userWordReviewEvent.findFirst({
      where: { userId: params.userId, wordId: params.wordId },
      orderBy: { reviewedAt: 'desc' },
      select: {
        correct: true,
        masteryBefore: true,
        masteryAfter: true,
        localDate: true,
      },
    });
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
        masteryBefore: params.masteryBefore,
        masteryAfter: params.masteryAfter,
      },
    });
  }

  async findBadgeSnapshot(userId: string): Promise<LearningBadgeFigures> {
    // Four independent reads, so they go together. Themes needs a
    // distinct over a join and has no aggregate form in Prisma, hence
    // the raw query.
    const [streak, wordsCollected, wordsNearMastery, themes] =
      await Promise.all([
        this.prisma.userLearningStreak.findFirst({
          where: { userId },
          select: { longestStreak: true },
        }),
        // Every row, matching the count the library header shows: a
        // badge that disagrees with the number on screen is worse than
        // one that counts a skipped word.
        this.prisma.userWordProgress.count({ where: { userId } }),
        this.prisma.userWordProgress.count({
          where: { userId, masteryLevel: { gte: FLUENT_MASTERY_LEVEL } },
        }),
        this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT vwt."themeId")::bigint AS count
          FROM user_word_progress uwp
          JOIN vocabulary_word_themes vwt ON vwt."wordId" = uwp."wordId"
          JOIN vocabulary_words vw ON vw.id = vwt."wordId"
          WHERE uwp."userId" = ${userId} AND uwp.status NOT IN ('SKIPPED', 'NEW')
        `,
      ]);

    return {
      longestStreak: streak?.longestStreak ?? 0,
      wordsCollected,
      wordsNearMastery,
      themesExplored: Number(themes[0]?.count ?? 0),
    };
  }

  async countMasteredWordsByLanguage(params: {
    userId: string;
  }): Promise<LanguageMasteredWords[]> {
    // Raw, because the language lives on the word: Prisma groups by a
    // column of the queried table, never by one across the relation.
    const rows = await this.prisma.$queryRaw<
      { language: string; count: bigint }[]
    >`
      SELECT vw."targetLanguage"::text AS language, COUNT(*)::bigint AS count
      FROM user_word_progress uwp
      JOIN vocabulary_words vw ON vw.id = uwp."wordId"
      WHERE uwp."userId" = ${params.userId}
        AND uwp."masteryLevel" >= ${FLUENT_MASTERY_LEVEL}
      GROUP BY vw."targetLanguage"
    `;

    return rows.map((row) => ({
      language: row.language,
      masteredWords: Number(row.count),
    }));
  }

  async awardBadges(params: {
    userId: string;
    codes: BadgeCode[];
  }): Promise<BadgeCode[]> {
    if (params.codes.length === 0) return [];

    // `createManyAndReturn` with `skipDuplicates` reports the rows this
    // call actually inserted, which is the whole point: the caller fires
    // a notification per badge, and a count would leave two racing
    // writers both claiming the same one.
    const inserted = await this.prisma.userBadge.createManyAndReturn({
      data: params.codes.map((code) => ({
        userId: params.userId,
        code: PrismaLearningMapper.toPrismaBadgeCode(code),
      })),
      skipDuplicates: true,
      select: { code: true },
    });

    return inserted.map((badge) =>
      PrismaLearningMapper.toDomainBadgeCode(badge.code),
    );
  }

  async findReviewXpFigures(params: XpWindowParams): Promise<ReviewXpFigures> {
    // One statement, not four: this is the busiest read in the app and
    // every parallel query holds its own connection from a shared cap.
    const [row] = await this.prisma.$queryRaw<
      { lifetime: bigint; recent: bigint; days: string[] }[]
    >`
      WITH counts AS (
        SELECT
          COUNT(*) FILTER (WHERE correct) AS lifetime,
          COUNT(*) FILTER (
            WHERE correct AND "localDate" BETWEEN ${params.from} AND ${params.to}
          ) AS recent
        FROM user_word_review_events
        WHERE "userId" = ${params.userId}
      ),
      mastery AS (
        SELECT COALESCE(array_agg(DISTINCT e."localDate"), '{}') AS days
        FROM user_word_review_events e
        WHERE e."userId" = ${params.userId}
          AND e."masteryAfter" >= ${UserWordProgressMasteryLevel.MASTERED}
          -- Mastering an older word is a review, not the day's journey.
          AND EXISTS (
            SELECT 1 FROM daily_word_assignments a
            WHERE a."userId" = e."userId"
              AND a."wordId" = e."wordId"
              AND a."assignedFor"::text = e."localDate"
          )
      )
      SELECT counts.lifetime, counts.recent, mastery.days FROM counts, mastery
    `;

    return {
      lifetimeCorrect: Number(row?.lifetime ?? 0),
      recentCorrect: Number(row?.recent ?? 0),
      masteryDays: row?.days ?? [],
    };
  }

  async findUserBadges(userId: string): Promise<EarnedBadge[]> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { code: true, earnedAt: true },
      orderBy: { earnedAt: 'desc' },
    });

    return rows.map((row) => ({
      code: PrismaLearningMapper.toDomainBadgeCode(row.code),
      earnedAt: row.earnedAt,
    }));
  }

  async findUserDailyActivity(
    params: FindUserDailyActivityParams,
  ): Promise<UserDailyActivity[]> {
    // The day was decided at write time, so reading it back is a string
    // range: no offsets, nothing to get wrong at a DST boundary.
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

    // Terms live on the word, mastery on the user, so both come through
    // the progress row.
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

    // Rebuilt from topWordIds: findMany does not preserve the order.
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
      brokenStreak: found.brokenStreak,
      brokenOnLocalDate: found.brokenOnLocalDate,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }
  async upsertUserLearningStreak(
    params: UpsertUserLearningStreakParams,
  ): Promise<UserLearningStreak> {
    const {
      userId,
      currentStreak,
      longestStreak,
      lastActivityLocalDate,
      brokenStreak,
      brokenOnLocalDate,
    } = params;

    // Spread rather than assigned: an ordinary review passes neither
    // field, and writing `undefined` would erase a break the learner is
    // still allowed to repair.
    const breakFields = {
      ...(brokenStreak !== undefined ? { brokenStreak } : {}),
      ...(brokenOnLocalDate !== undefined ? { brokenOnLocalDate } : {}),
    };

    const upserted = await this.prisma.userLearningStreak.upsert({
      where: { userId },
      update: {
        currentStreak,
        longestStreak,
        lastActivityLocalDate,
        ...breakFields,
      },
      create: {
        userId,
        currentStreak,
        longestStreak,
        lastActivityLocalDate,
        ...breakFields,
      },
    });

    return {
      id: upserted.id,
      lastActivityLocalDate: upserted.lastActivityLocalDate,
      userId: upserted.userId,
      currentStreak: upserted.currentStreak,
      longestStreak: upserted.longestStreak,
      brokenStreak: upserted.brokenStreak,
      brokenOnLocalDate: upserted.brokenOnLocalDate,
      createdAt: upserted.createdAt,
      updatedAt: upserted.updatedAt,
    };
  }

  async recordStreakRepairs(params: RecordStreakRepairsParams): Promise<void> {
    // skipDuplicates rather than a failure: a retried request must be a
    // no-op, never a second day bought.
    await this.prisma.userStreakRepair.createMany({
      data: params.repairedLocalDates.map((repairedLocalDate) => ({
        userId: params.userId,
        repairedLocalDate,
      })),
      skipDuplicates: true,
    });
  }

  async countStreakRepairsInMonth(
    params: CountStreakRepairsInMonthParams,
  ): Promise<number> {
    // Counted on when the repair was spent, not on the day it filled: a
    // repair bought on the 1st for the 31st belongs to the new month.
    const from = new Date(`${params.monthPrefix}-01T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);

    return this.prisma.userStreakRepair.count({
      where: {
        userId: params.userId,
        createdAt: { gte: from, lt: to },
      },
    });
  }

  async findStreakRepairs(params: FindStreakRepairsParams): Promise<string[]> {
    const rows = await this.prisma.userStreakRepair.findMany({
      where: {
        userId: params.userId,
        repairedLocalDate: { gte: params.from, lte: params.to },
      },
      select: { repairedLocalDate: true },
      orderBy: { repairedLocalDate: 'asc' },
    });

    return rows.map((row) => row.repairedLocalDate);
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
    // `lastReviewedAt` and `reviewCount` untouched: a date moved, not a
    // review.
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
    const { userId, targetLanguage, localDate, limit } = params;

    this.logger.log('Finding review queue', {
      userId,
      targetLanguage,
      localDate,
      limit,
    });

    const items = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        word: {
          targetLanguage:
            PrismaVocabularyMapper.toPrismaLanguageCode(targetLanguage),
        },
        // MASTERED and SKIPPED are excluded above, so a null
        // nextReviewOn can only mean "discovered, not yet practised".
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
            antonyms: true,
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
      antonyms: item.word.antonyms.map(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        PrismaVocabularyMapper.toDomainAntonym,
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
        // The computed state, not just the status: otherwise a fresh
        // word lands at mastery 0 with no seenAt.
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

    // Upsert, not create: two requests can race past the existence
    // check, and the loser must return the winner's word rather than
    // fail on the unique (profile, day) constraint.
    const created = await this.prisma.dailyWordAssignment.upsert({
      where: {
        userLearningProfileId_assignedFor: {
          userLearningProfileId,
          assignedFor,
        },
      },
      create: {
        userId,
        userLearningProfileId,
        wordId,
        assignedFor,
      },
      update: {},
      include: {
        word: {
          include: {
            examples: true,
            definitions: true,
            pronunciations: true,
            synonyms: true,
            antonyms: true,
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
        antonyms: created.word.antonyms,
        themes: created.word.themes.map((t) => t.theme),
      }),
    };
  }

  /**
   * The day's word, from the narrowest pool that still has one.
   *
   * Themes and level are preferences; only the language and "not
   * already served to this user" are requirements. Themes are relaxed
   * last: they are the one the learner actually chose.
   */
  async findCandidateWord(
    profile: UserLearningProfile,
  ): Promise<VocabularyWord | null> {
    const { themeSlugs, targetLanguage, difficulty, interfaceLanguage } =
      profile;

    const required: Prisma.VocabularyWordWhereInput = {
      targetLanguage,

      // No status filter: the corpus is all DRAFT for now, so filtering
      // would leave no daily word.

      dailyWordAssignments: {
        none: {
          userId: profile.userId,
        },
      },
    };

    const onTopic: Prisma.VocabularyWordWhereInput = {
      ...required,
      themes: { some: { theme: { slug: { in: themeSlugs } } } },
    };

    const ladder = [
      difficulty ? { ...onTopic, difficulty } : null,
      onTopic,
      difficulty ? { ...required, difficulty } : null,
      required,
    ].filter((where) => where !== null);

    // A definition the learner can read outranks topic and difficulty:
    // a word explained in a language they do not speak is the one case
    // users report as broken. The unconstrained ladder stays as the
    // fallback — a wrong-language definition beats no word at all.
    const explainable: Prisma.VocabularyWordWhereInput = {
      definitions: { some: { explanationLanguage: interfaceLanguage } },
    };

    const attempts = [
      ...ladder.map((where) => ({ ...where, ...explainable })),
      ...ladder,
    ];

    for (const where of attempts) {
      const word = await this.pickRandomWord(where);
      if (word) return word;
    }

    return null;
  }

  /**
   * One word, chosen uniformly, without reading the pool: `count` then
   * an offset, rather than transferring every match to discard all but
   * one of them.
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

  async countWordsByProfile(params: {
    userLearningProfileIds: string[];
  }): Promise<ProfileWordCount[]> {
    if (params.userLearningProfileIds.length === 0) return [];

    const rows = await this.prisma.dailyWordAssignment.groupBy({
      by: ['userLearningProfileId'],
      // No date filter: this is a lifetime total, and narrowing it to a
      // day would answer 0 or 1 for every profile.
      where: {
        userLearningProfileId: { in: params.userLearningProfileIds },
      },
      _count: { wordId: true },
    });

    return rows.map((row) => ({
      userLearningProfileId: row.userLearningProfileId,
      wordCount: row._count.wordId,
    }));
  }

  async findProfileDayStates(params: {
    userLearningProfileIds: string[];
    assignedFor: Date;
  }): Promise<ProfileDayState[]> {
    if (params.userLearningProfileIds.length === 0) return [];

    const assignments = await this.prisma.dailyWordAssignment.findMany({
      where: {
        userLearningProfileId: { in: params.userLearningProfileIds },
        assignedFor: params.assignedFor,
      },
      select: { userLearningProfileId: true, wordId: true, userId: true },
    });

    if (assignments.length === 0) return [];

    const localDate = instantToLocalDate(params.assignedFor);
    const answered = await this.prisma.quizResult.findMany({
      where: {
        localDate,
        wordId: { in: assignments.map((a) => a.wordId) },
        userId: { in: [...new Set(assignments.map((a) => a.userId))] },
      },
      select: { wordId: true },
    });

    const answeredWords = new Set(answered.map((row) => row.wordId));

    return assignments.map((assignment) => ({
      userLearningProfileId: assignment.userLearningProfileId,
      wordId: assignment.wordId,
      quizCompleted: answeredWords.has(assignment.wordId),
    }));
  }

  async findTodayAssignment(
    params: FindTodayAssignmentParams,
  ): Promise<TodayWordAssignment | null> {
    const { userLearningProfileId, assignedFor } = params;

    // findUnique on the composite key rather than findFirst on the user:
    // one word per profile per day is a database constraint, and asking
    // for it that way is what makes a second profile impossible to miss.
    const found = await this.prisma.dailyWordAssignment.findUnique({
      where: {
        userLearningProfileId_assignedFor: {
          userLearningProfileId,
          assignedFor: new Date(assignedFor),
        },
      },
      include: {
        word: {
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
        antonyms: found.word.antonyms,
        synonyms: found.word.synonyms,
        themes: found.word.themes.map((t) => t.theme),
      }),
    };
  }

  async findRandomWord(
    params: FindRandomWordParams,
  ): Promise<RandomWord | null> {
    const { themes, targetLanguage, difficulty, explanationLanguage } = params;

    const base = {
      // No status filter: the corpus is all DRAFT today, so PUBLISHED
      // would leave the welcome screen empty. Add it once ingestion
      // publishes.
      ...(themes?.length
        ? { themes: { some: { theme: { slug: { in: themes } } } } }
        : {}),
      ...(targetLanguage ? { targetLanguage } : {}),
      ...(difficulty ? { difficulty } : {}),
    };

    // A word the visitor can read outranks the free draw; the plain
    // draw stays as the fallback so the welcome screen never goes empty.
    const attempts = explanationLanguage
      ? [{ ...base, definitions: { some: { explanationLanguage } } }, base]
      : [base];

    for (const where of attempts) {
      // Count then skip: the endpoint is public and uncached, and the
      // whole vocabulary with its relations is not worth pulling per
      // request.
      const count = await this.prisma.vocabularyWord.count({ where });

      if (count === 0) {
        continue;
      }

      // Not `findFirstOrThrow`: rows can disappear between the count and
      // the read, and an empty page beats a 500.
      const randomWord = await this.prisma.vocabularyWord.findFirst({
        where,
        skip: Math.floor(Math.random() * count),
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

      if (!randomWord) {
        continue;
      }

      return {
        ...PrismaVocabularyMapper.toDomainAggregate({
          word: randomWord,
          definitions: randomWord.definitions,
          examples: randomWord.examples,
          pronunciations: randomWord.pronunciations,
          antonyms: randomWord.antonyms,
          synonyms: randomWord.synonyms,
          themes: randomWord.themes.map((t) => t.theme),
        }),
      };
    }

    return null;
  }
}
