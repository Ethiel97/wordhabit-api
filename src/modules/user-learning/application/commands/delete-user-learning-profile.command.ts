import { Command } from '@nestjs/cqrs';

export type DeleteUserLearningProfileResult = {
  success: boolean;
};

export class DeleteUserLearningProfileCommand extends Command<DeleteUserLearningProfileResult> {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
  ) {
    super();
  }
}
