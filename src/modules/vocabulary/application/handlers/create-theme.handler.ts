import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import { CreateThemeCommand } from '../commands/create-theme.command';
import { Theme } from '../../domain/entities/theme';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../domain/repositories/theme.repository';

@CommandHandler(CreateThemeCommand)
export class CreateThemeHandler implements ICommandHandler<
  CreateThemeCommand,
  Theme
> {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(command: CreateThemeCommand): Promise<Theme> {
    const existing = await this.themeRepository.findBySlug(command.slug);

    if (existing) {
      throw new ConflictException(
        `A theme with slug "${command.slug}" already exists.`,
      );
    }

    return this.themeRepository.create({
      name: command.name.trim(),
      slug: command.slug.trim(),
      description: command.description?.trim() ?? null,
    });
  }
}
