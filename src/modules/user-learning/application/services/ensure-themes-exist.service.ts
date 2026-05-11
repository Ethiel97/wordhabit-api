import { Inject, Injectable } from '@nestjs/common';
import {
  THEME_LOOKUP_PORT,
  type ThemeLookup,
} from '../../../../shared/application/ports/theme-lookup.port';
import { UnknownThemeSlugsError } from '../errors/unknown-theme-slugs.error';

@Injectable()
export class EnsureThemesExistService {
  constructor(
    @Inject(THEME_LOOKUP_PORT)
    private readonly themeLookup: ThemeLookup,
  ) {}

  async normalizeAndEnsure(themeSlugs: string[]): Promise<string[]> {
    const normalizedThemeSlugs = [
      ...new Set(
        themeSlugs
          .map((slug) => slug.trim().toLowerCase())
          .filter((slug) => slug.length > 0),
      ),
    ];

    if (normalizedThemeSlugs.length === 0) {
      return normalizedThemeSlugs;
    }

    const existingSlugs =
      await this.themeLookup.findExistingSlugs(normalizedThemeSlugs);

    const existingSlugSet = new Set(existingSlugs);
    const missingSlugs = normalizedThemeSlugs.filter(
      (slug) => !existingSlugSet.has(slug),
    );

    if (missingSlugs.length > 0) {
      throw new UnknownThemeSlugsError(missingSlugs);
    }

    return normalizedThemeSlugs;
  }
}
