import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserLearningProfileRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(20)
  username!: string;

  @IsIn(Object.values(LanguageCode))
  targetLanguage!: LanguageCode;

  @IsIn(Object.values(LanguageCode))
  interfaceLanguage!: LanguageCode;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  themeSlugs!: string[];
}
