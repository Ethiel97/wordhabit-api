import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import type {
  CreateQuizResultParams,
  FindQuizDistractorPoolParams,
  QuizRepository,
  QuizWordMaterial,
} from '../../domain/repositories/quiz.repository';
import type { QuizDistractorWord } from '../../domain/services/quiz-question-builder';

@Injectable()
export class PrismaQuizRepository implements QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuizWordMaterial(wordId: string): Promise<QuizWordMaterial | null> {
    const word = await this.prisma.vocabularyWord.findUnique({
      where: { id: wordId },
      include: {
        definitions: { select: { text: true } },
        examples: { select: { sentence: true } },
        synonyms: { select: { value: true } },
        antonyms: { select: { value: true } },
        quizScenarios: {
          select: {
            situation: true,
            question: true,
            correct: true,
            distractors: true,
          },
        },
      },
    });

    if (!word) return null;

    return {
      targetLanguage: word.targetLanguage as LanguageCode,
      difficulty: word.difficulty as WordDifficulty,
      target: {
        wordId: word.id,
        term: word.term,
        partOfSpeech: word.partOfSpeech as PartOfSpeech,
        definitions: word.definitions.map((def) => def.text),
        examples: word.examples.map((ex) => ex.sentence),
        synonyms: word.synonyms.map((syn) => syn.value),
        antonyms: word.antonyms.map((ant) => ant.value),
      },
      scenarios: word.quizScenarios,
    };
  }

  async findQuizDistractorPool(
    params: FindQuizDistractorPoolParams,
  ): Promise<QuizDistractorWord[]> {
    // Random offset rather than ORDER BY random(): the corpus per
    // language/difficulty is in the hundreds, and a full-table sort per
    // quiz would be the most expensive line of the feature.
    const where = {
      id: { not: params.wordId },
      targetLanguage: params.targetLanguage,
      difficulty: params.difficulty,
    } as const;

    const total = await this.prisma.vocabularyWord.count({ where });
    const skip = Math.max(
      0,
      Math.floor(Math.random() * Math.max(1, total - params.limit)),
    );

    const words = await this.prisma.vocabularyWord.findMany({
      where,
      skip,
      take: params.limit,
      include: {
        definitions: { select: { text: true } },
        synonyms: { select: { value: true } },
      },
    });

    return words.map((word) => ({
      term: word.term,
      partOfSpeech: word.partOfSpeech as PartOfSpeech,
      definitions: word.definitions.map((def) => def.text),
      synonyms: word.synonyms.map((syn) => syn.value),
    }));
  }

  async createQuizResult(params: CreateQuizResultParams): Promise<void> {
    await this.prisma.quizResult.create({
      data: {
        userId: params.userId,
        wordId: params.wordId,
        mode: params.mode,
        correctCount: params.correctCount,
        questionCount: params.questionCount,
        localDate: params.localDate,
      },
    });
  }

  async countCorrectQuizAnswers(params: {
    userId: string;
    from?: string;
    to?: string;
  }): Promise<number> {
    const aggregate = await this.prisma.quizResult.aggregate({
      where: {
        userId: params.userId,
        ...(params.from || params.to
          ? { localDate: { gte: params.from, lte: params.to } }
          : {}),
      },
      _sum: { correctCount: true },
    });
    return aggregate._sum.correctCount ?? 0;
  }

  async countPerfectQuizModes(params: { userId: string }): Promise<number> {
    // Perfect is computed, never stored — see the schema comment.
    const modes = await this.prisma.quizResult.findMany({
      where: {
        userId: params.userId,
        questionCount: { gt: 0 },
        // Prisma cannot compare two columns; the raw filter stays in
        // one place here rather than leaking SQL into the handler.
      },
      select: { mode: true, correctCount: true, questionCount: true },
    });
    const perfect = new Set(
      modes
        .filter((r) => r.correctCount === r.questionCount)
        .map((r) => r.mode),
    );
    return perfect.size;
  }
}
