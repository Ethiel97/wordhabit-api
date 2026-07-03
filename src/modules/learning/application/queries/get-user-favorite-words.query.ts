import { Query } from '@nestjs/cqrs';
import { FavoriteWord } from '../../domain/entities/favorite-word';

export class GetUserFavoriteWordsQuery extends Query<GetUserFavoriteWordsResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export type GetUserFavoriteWordsResult = {
  favoriteWords: FavoriteWord[];
};
