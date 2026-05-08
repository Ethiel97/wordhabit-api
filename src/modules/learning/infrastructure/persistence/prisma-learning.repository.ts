import {
  CreateDailyAssignmentParams,
  FindTodayAssignmentParams,
  LearningRepository,
  TodayWordAssignment,
} from '../../domain/repositories/learning.repository';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaVocabularyMapper } from '../../../vocabulary/infrastructure/persistence/prisma-vocabulary.mapper';

@Injectable()
export class PrismaLearningRepository implements LearningRepository {
  private readonly logger = new Logger(PrismaLearningRepository.name);

  constructor(private readonly prisma: PrismaService) {}

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

    console.log('Finding candidate words for profile', {
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
}
