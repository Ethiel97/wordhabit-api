import { Command } from '@nestjs/cqrs';
import { FavoriteWord } from '../../domain/entities/favorite-word';

export class AddUserFavoriteWordCommand extends Command<AddUserFavoriteWordResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
  ) {
    super();
  }
}

export type AddUserFavoriteWordResult = {
  favoriteWord: FavoriteWord;
};
