import { Command } from '@nestjs/cqrs';
import { type AuthenticatedUser } from '../../domain/entities/authenticated-user';

export class UpdateMeCommand extends Command<AuthenticatedUser> {
  constructor(
    readonly userId: string,
    readonly name?: string,
  ) {
    super();
  }
}
