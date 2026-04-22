import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export class GenerateVocabularyBatchRequestDto {
  @IsIn(Object.values(LanguageCode))
  targetLanguage!: LanguageCode;

  @IsOptional()
  @IsIn(Object.values(LanguageCode))
  explanationLanguage?: LanguageCode;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count!: number;

  @IsOptional()
  @IsString()
  theme?: string;
}
