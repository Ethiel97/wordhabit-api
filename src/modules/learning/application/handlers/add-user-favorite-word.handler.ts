import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { LearningRepository } from '../../domain/repositories/learning.repository';
import { LEARNING_REPOSITORY } from '../../domain/repositories/learning.repository';
import {
  AddUserFavoriteWordCommand,
  AddUserFavoriteWordResult,
} from '../commands/add-user-favorite-word.command';

@CommandHandler(AddUserFavoriteWordCommand)
export class AddUserFavoriteWordHandler implements ICommandHandler<
  AddUserFavoriteWordCommand,
  AddUserFavoriteWordResult
> {
  constructor(
    @Inject(LEARNING_REPOSITORY)
    private readonly learningRepository: LearningRepository,
  ) {}

  async execute(
    command: AddUserFavoriteWordCommand,
  ): Promise<AddUserFavoriteWordResult> {
    const favoriteWord = await this.learningRepository.addUserFavoriteWord(
      command.userId,
      command.wordId,
    );

    return { favoriteWord };
  }
}
