import {
  CreateDailyAssignmentParams,
  FindRandomWordParams,
  FindReviewQueueParams,
  FindTodayAssignmentParams,
  FindUserWordLibraryParams,
  FindUserWordProgressParams,
  LearningRepository,
  RandomWord,
  ReviewQueueItem,
  TodayWordAssignment,
  UpdateUserWordReviewParams,
  UpsertUserLearningStreakParams,
  UserLearningStats,
  UserWordLibraryResult,
} from '../../domain/repositories/learning.repository';
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

@Injectable()
export class PrismaLearningRepository implements LearningRepository {
  private readonly logger = new Logger(PrismaLearningRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findUserWordLibrary(
    params: FindUserWordLibraryParams,
  ): Promise<UserWordLibraryResult> {
    const { userId, status, search, limit, cursor } = params;
    const items = await this.prisma.userWordProgress.findMany({
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
        word: true,
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
    });

    const hasNextPage = items.length > limit;
    const pageItems = hasNextPage ? items.slice(0, limit) : items;

    return {
      items: pageItems.map((item) => ({
        progressId: item.id,
        wordId: item.wordId,
        term: item.word.term,
        normalizedTerm: item.word.normalizedTerm,
        status: PrismaLearningMapper.toDomainUserWordProgressStatus(
          item.status,
        ),
        masteryLevel: item.masteryLevel,
        reviewCount: item.reviewCount,
        lastReviewedAt: item.lastReviewedAt,
        nextReviewAt: item.nextReviewAt,
        updatedAt: item.updatedAt,
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
      lastActivityDate: found.lastActivityDate as Date,
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
    const { userId, currentStreak, longestStreak, lastActivityDate } = params;

    const upserted = await this.prisma.userLearningStreak.upsert({
      where: { userId },
      update: {
        currentStreak,
        longestStreak,
        lastActivityDate,
      },
      create: {
        userId,
        currentStreak,
        longestStreak,
        lastActivityDate,
      },
    });

    return {
      id: upserted.id,
      lastActivityDate: upserted.lastActivityDate as Date,
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
        nextReviewAt: params.nextReviewAt,
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
    const { userId, now, limit } = params;

    this.logger.log('Finding review queue', { userId, now, limit });

    const items = await this.prisma.userWordProgress.findMany({
      where: {
        status: UserWordProgressStatus.LEARNING,
        userId,
        nextReviewAt: {
          lte: now,
        },
      },
      take: limit,
      orderBy: [{ nextReviewAt: 'asc' }, { masteryLevel: 'asc' }],
      include: {
        word: true,
      },
    });

    return items.map((item) => ({
      progressId: item.id,
      wordId: item.wordId,
      term: item.word.term,
      masteryLevel: item.masteryLevel,
      reviewCount: item.reviewCount,
      status: PrismaLearningMapper.toDomainUserWordProgressStatus(item.status),
      nextReviewAt: item.nextReviewAt,
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
    nextReviewAt?: Date | null;
  }): Promise<UserWordProgress> {
    const { userId, wordId, status } = params;
    const found = await this.prisma.userWordProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: {
        status: PrismaLearningMapper.toPrismaUserWordProgressStatus(status),
        masteryLevel: params.masteryLevel,
        seenAt: params.seenAt,
        nextReviewAt: params.nextReviewAt,
      },
      create: {
        userId,
        wordId,
        status: PrismaLearningMapper.toPrismaUserWordProgressStatus(status),
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
          },
        },
      },
    });

    return {
      assignedFor: created.assignedFor,
      assignmentId: created.id,
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: created.word,
        definitions: created.word.definitions,
        examples: created.word.examples,
        pronunciations: created.word.pronunciations,
        synonyms: created.word.synonyms,
      }),
    };
  }

  async findCandidateWord(
    profile: UserLearningProfile,
  ): Promise<VocabularyWord | null> {
    const { themeSlugs } = profile;
    const { targetLanguage } = profile;

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    this.logger.log('Finding candidate words for profile', {
      themeSlugs,
      targetLanguage,
      twoWeeksAgo,
    });

    const candidateWords = await this.prisma.vocabularyWord.findMany({
      where: {
        themes: { some: { theme: { slug: { in: themeSlugs } } } },
        targetLanguage: targetLanguage,
        //TODO: Add status filter to exclude drafts and archived words

        // Exclude words that have already been assigned to the user
        // and words that were assigned less than 2 weeks ago
        dailyWordAssignments: {
          none: {
            userId: profile.userId,
            assignedFor: {
              gte: twoWeeksAgo,
            },
          },
        },
      },
      include: {
        themes: {
          include: {
            theme: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    this.logger.log('candidateWords', candidateWords);

    if (candidateWords.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * candidateWords.length);
    const randomWord = candidateWords[randomIndex];

    this.logger.log('randomWord', randomWord);
    return {
      id: randomWord.id,
      term: randomWord.term,
      targetLanguage: PrismaVocabularyMapper.toDomainLanguageCode(
        randomWord.targetLanguage,
      ),
      normalizedTerm: randomWord.normalizedTerm,
      createdAt: randomWord.createdAt,
      updatedAt: randomWord.updatedAt,
      difficulty: PrismaVocabularyMapper.toDomainDifficulty(
        randomWord.difficulty,
      ),
      partOfSpeech: PrismaVocabularyMapper.toDomainPartOfSpeech(
        randomWord.partOfSpeech,
      ),

      status: PrismaVocabularyMapper.toDomainStatus(randomWord.status),
    };
  }

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
          },
        },
      },
    });

    if (!found) {
      return null;
    }

    return {
      assignedFor: found.assignedFor,
      assignmentId: found.id,
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: found.word,
        definitions: found.word.definitions,
        examples: found.word.examples,
        pronunciations: found.word.pronunciations,
        synonyms: found.word.synonyms,
      }),
    };
  }

  async findRandomWord(
    params: FindRandomWordParams,
  ): Promise<RandomWord | null> {
    const count = await this.prisma.vocabularyWord.count({ where: params });

    if (count === 0) {
      return null;
    }

    const randomSkip = Math.floor(Math.random() * count);

    const randomWord = await this.prisma.vocabularyWord.findFirstOrThrow({
      where: params,
      skip: randomSkip,
      include: {
        definitions: true,
        examples: true,
        pronunciations: true,
        synonyms: true,
      },
    });

    return {
      ...PrismaVocabularyMapper.toDomainAggregate({
        word: randomWord,
        definitions: randomWord.definitions,
        examples: randomWord.examples,
        pronunciations: randomWord.pronunciations,
        synonyms: randomWord.synonyms,
      }),
    };
  }
}
