import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import type {
  CreateQuizResultParams,
  FindQuizDistractorPoolParams,
  FindQuizWordMaterialParams,
  QuizRepository,
  QuizWordMaterial,
} from '../../domain/repositories/quiz.repository';
import type { QuizDistractorWord } from '../../domain/services/quiz-question-builder';
import type { QuizModePerfectDays } from '../../domain/services/badge-catalog';

/**
 * The rows in [preferred], or falling back down the [fallbacks] chain,
 * or whatever language has the most rows. A quiz in a language the
 * learner did not ask for beats no quiz at all — the corpus does not
 * hold every explanation language for every word.
 */
function pickLanguage<T>(
  rows: T[],
  languageOf: (row: T) => string,
  preferred: (string | null)[],
): { rows: T[]; language: LanguageCode | null } {
  if (rows.length === 0) return { rows, language: null };

  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const language = languageOf(row);
    groups.set(language, [...(groups.get(language) ?? []), row]);
  }

  for (const candidate of preferred) {
    if (candidate && groups.has(candidate)) {
      return {
        rows: groups.get(candidate)!,
        language: candidate as LanguageCode,
      };
    }
  }

  const [language, largest] = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0];
  return { rows: largest, language: language as LanguageCode };
}

@Injectable()
export class PrismaQuizRepository implements QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuizWordMaterial(
    params: FindQuizWordMaterialParams,
  ): Promise<QuizWordMaterial | null> {
    const word = await this.prisma.vocabularyWord.findUnique({
      where: { id: params.wordId },
      include: {
        definitions: { select: { text: true, explanationLanguage: true } },
        examples: { select: { sentence: true } },
        synonyms: { select: { value: true } },
        antonyms: { select: { value: true } },
        quizScenarios: {
          select: {
            language: true,
            situation: true,
            question: true,
            correct: true,
            distractors: true,
          },
        },
      },
    });

    if (!word) return null;

    const definitions = pickLanguage(
      word.definitions,
      (def) => def.explanationLanguage,
      [params.preferredLanguage, word.targetLanguage],
    );
    // Scenario prose follows the definitions: mixing the two languages
    // inside one round reads as a bug even when each is defensible.
    const scenarios = pickLanguage(
      word.quizScenarios,
      (scenario) => scenario.language,
      [definitions.language, params.preferredLanguage, word.targetLanguage],
    );

    return {
      targetLanguage: word.targetLanguage as LanguageCode,
      difficulty: word.difficulty as WordDifficulty,
      explanationLanguage: definitions.language,
      target: {
        wordId: word.id,
        term: word.term,
        partOfSpeech: word.partOfSpeech as PartOfSpeech,
        definitions: definitions.rows.map((def) => def.text),
        examples: word.examples.map((ex) => ex.sentence),
        synonyms: word.synonyms.map((syn) => syn.value),
        antonyms: word.antonyms.map((ant) => ant.value),
      },
      scenarios: scenarios.rows,
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
        definitions: {
          select: { text: true },
          // Strict, no fallback: a wrong answer in another language than
          // the right one would give the game away. A word with nothing
          // in this language still lends its term and synonyms.
          ...(params.explanationLanguage
            ? { where: { explanationLanguage: params.explanationLanguage } }
            : {}),
        },
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

  async findQuizDays(params: {
    userId: string;
    from?: string;
    to?: string;
  }): Promise<string[]> {
    // groupBy, not distinct: Prisma applies distinct client-side.
    const rows = await this.prisma.quizResult.groupBy({
      by: ['localDate'],
      where: {
        userId: params.userId,
        ...(params.from || params.to
          ? { localDate: { gte: params.from, lte: params.to } }
          : {}),
      },
    });
    return rows.map((row) => row.localDate);
  }

  async findPerfectQuizDaysByMode(params: {
    userId: string;
  }): Promise<QuizModePerfectDays[]> {
    // Perfect is computed, never stored — see the schema comment.
    const rounds = await this.prisma.quizResult.findMany({
      where: {
        userId: params.userId,
        questionCount: { gt: 0 },
        // Prisma cannot compare two columns; the raw filter stays in
        // one place here rather than leaking SQL into the handler.
      },
      select: {
        mode: true,
        localDate: true,
        correctCount: true,
        questionCount: true,
      },
    });

    // Days, not rounds: two perfect rounds in one afternoon are one day
    // of playing well, which is what the badge is asking for.
    const daysByMode = new Map<string, Set<string>>();
    for (const round of rounds) {
      if (round.correctCount !== round.questionCount) continue;
      const days = daysByMode.get(round.mode) ?? new Set<string>();
      days.add(round.localDate);
      daysByMode.set(round.mode, days);
    }

    return [...daysByMode].map(([mode, days]) => ({
      mode,
      perfectDays: days.size,
    }));
  }

  async hasQuizResultForWord(params: {
    userId: string;
    wordId: string;
    localDate: string;
  }): Promise<boolean> {
    const resultClient = await this.prisma.quizResult.findFirst({
      where: {
        userId: params.userId,
        wordId: params.wordId,
        localDate: params.localDate,
      },
      select: { id: true },
    });
    return resultClient !== null;
  }
}
