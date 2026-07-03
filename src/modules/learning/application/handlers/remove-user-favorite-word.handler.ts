import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  RemoveUserFavoriteWordCommand,
  RemoveUserFavoriteWordResult,
} from '../commands/remove-user-favorite-word.command';

@CommandHandler(RemoveUserFavoriteWordCommand)
export class RemoveUserFavoriteWordHandler implements ICommandHandler<
  RemoveUserFavoriteWordCommand,
  RemoveUserFavoriteWordResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    command: RemoveUserFavoriteWordCommand,
  ): Promise<RemoveUserFavoriteWordResult> {
    const removed = await this.learningRepository.removeUserFavoriteWord(
      command.userId,
      command.wordId,
    );

    return { removed };
  }
}
