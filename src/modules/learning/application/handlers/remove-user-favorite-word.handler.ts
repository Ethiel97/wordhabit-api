import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import { WORD_LIBRARY_REPOSITORY } from '../../domain/repositories/learning.repository';
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
    @Inject(WORD_LIBRARY_REPOSITORY)
    private readonly libraryRepository: WordLibraryRepository,
  ) {}

  async execute(
    command: RemoveUserFavoriteWordCommand,
  ): Promise<RemoveUserFavoriteWordResult> {
    const removed = await this.libraryRepository.removeUserFavoriteWord(
      command.userId,
      command.wordId,
    );

    return { removed };
  }
}
