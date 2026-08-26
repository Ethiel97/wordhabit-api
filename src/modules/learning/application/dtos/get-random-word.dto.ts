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

  @IsOptional()
  @IsEnum(LanguageCode)
  explanationLanguage?: LanguageCode;

  /**
   * Theme slugs to draw the word from. Normalised to an array: Express
   * parses `?themes=a` as a bare string, which reaches Prisma's `in`
   * filter as a 500 rather than a 400. Comma-separated is accepted too.
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
