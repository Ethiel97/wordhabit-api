import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export class GenerateVocabularyBatchRequestDto {
  @IsIn(Object.values(LanguageCode))
  targetLanguage: LanguageCode = LanguageCode.EN;

  @IsOptional()
  @IsIn(Object.values(LanguageCode))
  explanationLanguage?: LanguageCode = LanguageCode.EN;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count: number = 20;
}
