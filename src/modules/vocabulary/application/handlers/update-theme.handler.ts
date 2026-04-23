import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { UpdateThemeCommand } from '../commands/update-theme.command';
import { Theme } from '../../domain/entities/theme';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../domain/repositories/theme.repository';

@CommandHandler(UpdateThemeCommand)
export class UpdateThemeHandler implements ICommandHandler<
  UpdateThemeCommand,
  Theme
> {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(command: UpdateThemeCommand): Promise<Theme> {
    const existing = await this.themeRepository.findById(command.id);

    if (!existing) {
      throw new NotFoundException(`Theme with id "${command.id}" not found.`);
    }

    return this.themeRepository.update(command.id, {
      name: command.name?.trim(),
      description: command.description?.trim() ?? null,
    });
  }
}
