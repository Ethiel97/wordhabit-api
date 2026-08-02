import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export class CreateUserLearningProfileRequestDto {
  @IsIn(Object.values(LanguageCode))
  targetLanguage!: LanguageCode;

  @IsIn(Object.values(LanguageCode))
  interfaceLanguage!: LanguageCode;

  /**
   * How hard the daily words should be.
   *
   * Optional so an older client that never asked can still create a
   * profile; the server then draws from every difficulty.
   */
  @IsOptional()
  @IsIn(Object.values(WordDifficulty))
  difficulty?: WordDifficulty;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  themeSlugs!: string[];
}
