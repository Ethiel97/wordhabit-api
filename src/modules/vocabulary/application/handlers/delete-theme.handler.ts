import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { DeleteThemeCommand } from '../commands/delete-theme.command';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../domain/repositories/theme.repository';

@CommandHandler(DeleteThemeCommand)
export class DeleteThemeHandler implements ICommandHandler<
  DeleteThemeCommand,
  void
> {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(command: DeleteThemeCommand): Promise<void> {
    const existing = await this.themeRepository.findById(command.id);

    if (!existing) {
      throw new NotFoundException(`Theme with id "${command.id}" not found.`);
    }

    await this.themeRepository.delete(command.id);
  }
}
