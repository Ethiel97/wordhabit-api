import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserLearningProfileRequestDto {
  @IsIn(Object.values(LanguageCode))
  targetLanguage!: LanguageCode;

  @IsIn(Object.values(LanguageCode))
  interfaceLanguage!: LanguageCode;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  themeSlugs!: string[];
}
