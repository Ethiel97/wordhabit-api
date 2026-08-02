import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateMeCommand } from '../commands/update-me.command';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/repositories/auth-user.repository';
import { Inject, NotFoundException } from '@nestjs/common';
import { type AuthenticatedUser } from '../../domain/entities/authenticated-user';

@CommandHandler(UpdateMeCommand)
export class UpdateMeHandler implements ICommandHandler<
  UpdateMeCommand,
  AuthenticatedUser
> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {}

  async execute(command: UpdateMeCommand): Promise<AuthenticatedUser> {
    const { userId, name } = command;

    const user = await this.authUserRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.authUserRepository.update(userId, { name });

    // Mapped down, never returned raw: the domain user carries the
    // password hash and the token version, and the controller serialises
    // whatever it is handed.
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      emailVerified: !!updated.emailVerifiedAt,
    };
  }
}
