import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export class GetRandomWordDto {
  @IsOptional()
  @IsEnum(LanguageCode)
  languageCode?: LanguageCode;

  @IsOptional()
  @IsEnum(WordDifficulty)
  difficulty?: WordDifficulty;

  /**
   * Theme slugs to draw the word from.
   *
   * Normalised to an array because Express parses `?themes=a&themes=b`
   * as `string[]` but `?themes=a` as a bare `string` — and a bare
   * string reaching Prisma's `in` filter is a 500, not a 400. The
   * comma-separated form is accepted too, since that is what a
   * hand-built URL usually looks like.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  themes?: string[];
}
