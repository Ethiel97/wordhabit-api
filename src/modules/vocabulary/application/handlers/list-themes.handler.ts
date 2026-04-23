import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListThemesQuery } from '../queries/list-themes.query';
import { Theme } from '../../domain/entities/theme';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../domain/repositories/theme.repository';

@QueryHandler(ListThemesQuery)
export class ListThemesHandler implements IQueryHandler<
  ListThemesQuery,
  Theme[]
> {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(): Promise<Theme[]> {
    return this.themeRepository.list();
  }
}
