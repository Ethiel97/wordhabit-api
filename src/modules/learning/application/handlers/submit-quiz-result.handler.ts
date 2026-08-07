import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject } from '@nestjs/common';
import {
  SubmitQuizResultCommand,
  SubmitQuizResultResult,
} from '../commands/submit-quiz-result.command';
import type { QuizRepository } from '../../domain/repositories/quiz.repository';
import { QUIZ_REPOSITORY } from '../../domain/repositories/quiz.repository';
import { XP_PER_QUIZ_ANSWER } from '../../domain/services/xp-scale';
import { BadgeAwarderService } from '../services/badge-awarder.service';

@CommandHandler(SubmitQuizResultCommand)
export class SubmitQuizResultHandler implements ICommandHandler<
  SubmitQuizResultCommand,
  SubmitQuizResultResult
> {
  constructor(
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: QuizRepository,
    private readonly badgeAwarder: BadgeAwarderService,
  ) {}

  async execute(
    command: SubmitQuizResultCommand,
  ): Promise<SubmitQuizResultResult> {
    if (
      command.questionCount <= 0 ||
      command.correctCount < 0 ||
      command.correctCount > command.questionCount
    ) {
      // The score is client-reported — same trust model as flashcards —
      // but an impossible one is a bug or a forgery, never a result.
      throw new BadRequestException('Impossible quiz score.');
    }

    await this.quizRepository.createQuizResult({
      userId: command.userId,
      wordId: command.wordId,
      mode: command.mode,
      correctCount: command.correctCount,
      questionCount: command.questionCount,
      localDate: command.localDate,
    });

    // Last, and never able to fail the submission: a perfect round may
    // have just completed the QUIZ_CHAMPION set.
    const newBadges = await this.badgeAwarder.awardQuietly(command.userId);

    return {
      earnedXp: command.correctCount * XP_PER_QUIZ_ANSWER,
      perfect: command.correctCount === command.questionCount,
      newBadges,
    };
  }
}
