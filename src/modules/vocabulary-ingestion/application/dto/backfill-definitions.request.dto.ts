import { IsIn, IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export class BackfillDefinitionsRequestDto {
  /** The language of the words to enrich. */
  @IsIn(Object.values(LanguageCode))
  targetLanguage: LanguageCode = LanguageCode.EN;

  /** The language the new definitions are written in. */
  @IsIn(Object.values(LanguageCode))
  explanationLanguage: LanguageCode = LanguageCode.EN;

  /**
   * Words to enrich in this run. Capped so one HTTP call cannot queue an
   * hour of reasoning-model time — the corpus backfills over repeated
   * calls, which is also what makes a failed run cheap.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count: number = 50;
}
