export const THEME_LOOKUP_PORT = Symbol('THEME_LOOKUP_PORT');

export interface ThemeLookup {
  findExistingSlugs(slugs: string[]): Promise<string[]>;
}
