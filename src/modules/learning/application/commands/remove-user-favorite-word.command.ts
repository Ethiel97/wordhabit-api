import { Command } from '@nestjs/cqrs';

export class RemoveUserFavoriteWordCommand extends Command<RemoveUserFavoriteWordResult> {
  constructor(
    public readonly userId: string,
    public readonly wordId: string,
  ) {
    super();
  }
}

export type RemoveUserFavoriteWordResult = {
  removed: boolean;
};
