import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  SetUserWordProgressCommand,
  SetUserWordProgressStatusResult,
} from '../commands/set-user-word-progress.command';
import { computeNextUserWordProgressState } from '../../domain/services/user-word-progress-state-machine';

@CommandHandler(SetUserWordProgressCommand)
export class SetUserWordProgressHandler implements ICommandHandler<
  SetUserWordProgressCommand,
  SetUserWordProgressStatusResult
> {
  private readonly logger = new Logger(SetUserWordProgressHandler.name);

  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    command: SetUserWordProgressCommand,
  ): Promise<SetUserWordProgressStatusResult> {
    const { userId, wordId, status } = command;

    const current = await this.learningRepository.findUserWordProgress({
      userId,
      wordId,
    });

    const nextState = computeNextUserWordProgressState({
      current,
      requestedStatus: status,
      now: new Date(),
    });

    const updatedProgress =
      await this.learningRepository.setUserWordProgressStatus({
        userId,
        wordId,
        ...nextState,
      });

    return {
      userId: updatedProgress.userId,
      wordId: updatedProgress.wordId,
      status: updatedProgress.status,
      masteryLevel: updatedProgress.masteryLevel,
      nextReviewAt: updatedProgress.nextReviewAt,
      updatedAt: updatedProgress.updatedAt,
    };
  }
}
