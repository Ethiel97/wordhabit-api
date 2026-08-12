import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { WordLibraryRepository } from '../../domain/repositories/learning.repository';
import { WORD_LIBRARY_REPOSITORY } from '../../domain/repositories/learning.repository';
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
    @Inject(WORD_LIBRARY_REPOSITORY)
    private readonly libraryRepository: WordLibraryRepository,
  ) {}

  async execute(
    command: AddUserFavoriteWordCommand,
  ): Promise<AddUserFavoriteWordResult> {
    const favoriteWord = await this.libraryRepository.addUserFavoriteWord(
      command.userId,
      command.wordId,
    );

    return { favoriteWord };
  }
}
