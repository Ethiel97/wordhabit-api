import {
  CreateDailyAssignmentParams,
  FindRandomWordParams,
  FindReviewQueueParams,
  FindTodayAssignmentParams,
  FindUserWordProgressParams,
  LearningRepository,
  RandomWord,
  ReviewQueueItem,
  TodayWordAssignment,
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

@Injectable()
export class PrismaLearningRepository implements LearningRepository {
  private readonly logger = new Logger(PrismaLearningRepository.name);

  constructor(private readonly prisma: PrismaService) {}

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
