import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetThemeBySlugQuery } from '../queries/get-theme-by-slug.query';
import { Theme } from '../../domain/entities/theme';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../domain/repositories/theme.repository';

@QueryHandler(GetThemeBySlugQuery)
export class GetThemeBySlugHandler implements IQueryHandler<
  GetThemeBySlugQuery,
  Theme
> {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(query: GetThemeBySlugQuery): Promise<Theme> {
    const theme = await this.themeRepository.findBySlug(query.slug);

    if (!theme) {
      throw new NotFoundException(`Theme with slug "${query.slug}" not found.`);
    }

    return theme;
  }
}
