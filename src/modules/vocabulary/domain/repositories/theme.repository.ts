import { Theme } from '../entities/theme';

export const THEME_REPOSITORY = Symbol('THEME_REPOSITORY');
export interface CreateThemeParams {
  name: string;
  slug: string;
  description?: string | null;
}
export interface UpdateThemeParams {
  name?: string;
  description?: string | null;
}
export interface ThemeRepository {
  findById(id: string): Promise<Theme | null>;
  findBySlug(slug: string): Promise<Theme | null>;
  list(): Promise<Theme[]>;
  create(params: CreateThemeParams): Promise<Theme>;
  update(id: string, params: UpdateThemeParams): Promise<Theme>;
  delete(id: string): Promise<void>;
}
