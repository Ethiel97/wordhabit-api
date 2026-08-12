import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';

/**
 * A true PATCH: every field is optional and only the ones present are
 * written. A client editing the language pair must not have to echo
 * back themes it never showed the user — two screens editing different
 * halves of the same profile would otherwise overwrite each other.
 */
export class UpdateUserLearningProfileDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  themeSlugs?: string[];

  @IsOptional()
  @IsEnum(LanguageCode)
  interfaceLanguage: LanguageCode;

  @IsEnum(LanguageCode)
  @IsOptional()
  targetLanguage!: LanguageCode;

  @IsEnum(WordDifficulty)
  @IsOptional()
  difficulty!: WordDifficulty;

  /** Null clears the reminder; absent leaves it alone. */
  @IsOptional()
  @IsEnum(NotificationSlot)
  reminderSlot?: NotificationSlot | null;
}
