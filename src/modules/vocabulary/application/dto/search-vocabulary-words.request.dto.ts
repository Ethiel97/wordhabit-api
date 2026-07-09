import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LanguageCode } from '../../domain/entities/language-code';
import { WordDifficulty } from '../../domain/entities/word-difficulty';

export class SearchVocabularyWordsRequestDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  targetLanguage?: LanguageCode;

  @IsOptional()
  @IsEnum(WordDifficulty)
  difficulty?: WordDifficulty;
}
