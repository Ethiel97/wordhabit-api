import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  GetWordQuizQuery,
  GetWordQuizResult,
} from '../queries/get-word-quiz.query';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import { QUIZ_REPOSITORY } from '../../domain/repositories/quiz.repository';
import { QuizMode } from '../../domain/entities/quiz';
import {
  buildQuizQuestions,
  MIN_QUIZ_QUESTIONS,
} from '../../domain/services/quiz-question-builder';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../../user-learning/domain/repositories/user-learning.repository';

/**
 * Distractor words fetched per round. More than any single question
 * needs, so the builder can drop duplicates and same-as-target values
 * and still fill every option slot.
 */
const DISTRACTOR_POOL_SIZE = 8;

@QueryHandler(GetWordQuizQuery)
export class GetWordQuizHandler implements IQueryHandler<
  GetWordQuizQuery,
  GetWordQuizResult
> {
  constructor(
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,

    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  async execute(query: GetWordQuizQuery): Promise<GetWordQuizResult> {
    // Definitions and scenario prose come in the learner's own language
    // when the corpus has it; the term, examples, synonyms and quoted
    // replies stay in the target language — that is the skill under test.
    const profile =
      await this.userLearningRepository.findActiveUserLearningProfile(
        query.userId,
      );

    const material = await this.quizRepository.findQuizWordMaterial({
      wordId: query.wordId,
      preferredLanguage: profile?.interfaceLanguage ?? null,
    });
    if (!material) {
      throw new NotFoundException('Unknown word.');
    }

    // REALWORLD needs no pool: its wrong answers were written at
    // ingestion, and fetching eight words to ignore them would be the
    // most expensive no-op in the request.
    const pool =
      query.mode === QuizMode.REALWORLD
        ? []
        : await this.quizRepository.findQuizDistractorPool({
            wordId: query.wordId,
            targetLanguage: material.targetLanguage,
            difficulty: material.difficulty,
            explanationLanguage: material.explanationLanguage,
            limit: DISTRACTOR_POOL_SIZE,
          });

    const questions = buildQuizQuestions({
      word: material.target,
      pool,
      scenarios: material.scenarios,
      mode: query.mode,
    });

    if (questions.length < MIN_QUIZ_QUESTIONS) {
      // Honest failure over a two-question "challenge": REALWORLD hits
      // this when a word predates the backfill, the others when the
      // corpus is too thin to fill the option slots.
      throw new NotFoundException(
        'Not enough material to build this quiz yet.',
      );
    }

    return {
      wordId: material.target.wordId,
      term: material.target.term,
      mode: query.mode,
      questions,
    };
  }
}
