import { LanguageCode } from '../../domain/entities/language-code';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';
import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { VocabularyWordStatus } from '../../domain/entities/vocabulary-word-status';

export class ListVocabularyWordsRequestDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(Object.values(LanguageCode))
  targetLanguage?: LanguageCode;

  @IsOptional()
  @IsIn(Object.values(WordDifficulty))
  difficulty?: WordDifficulty;

  @IsOptional()
  @IsIn(Object.values(PartOfSpeech))
  partOfSpeech?: PartOfSpeech;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(VocabularyWordStatus))
  status?: VocabularyWordStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
