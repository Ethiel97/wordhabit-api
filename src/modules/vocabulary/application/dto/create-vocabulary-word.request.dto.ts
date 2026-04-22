import { LanguageCode } from '../../domain/entities/language-code';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';
import { Type } from 'class-transformer';
import { WordDifficulty } from '../../domain/entities/word-difficulty';

class CreateWordDefinitionDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsIn(Object.values(LanguageCode))
  explanationLanguage: LanguageCode = LanguageCode.EN;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  register?: string;
}

class CreateWordExampleDto {
  @IsString()
  @IsNotEmpty()
  sentence!: string;

  @IsOptional()
  @IsString()
  translation?: string;

  @IsOptional()
  @IsIn(Object.values(LanguageCode))
  translationLanguage?: LanguageCode;
}

class CreateWordPronunciationDto {
  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

class CreateWordSynonymDto {
  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class CreateVocabularyWordRequestDto {
  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsIn(Object.values(LanguageCode))
  targetLanguage: LanguageCode = LanguageCode.EN;

  @IsIn(Object.values(WordDifficulty))
  difficulty!: WordDifficulty;

  @IsIn(Object.values(PartOfSpeech))
  partOfSpeech!: PartOfSpeech;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWordDefinitionDto)
  definitions!: CreateWordDefinitionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWordExampleDto)
  examples?: CreateWordExampleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWordPronunciationDto)
  pronunciations?: CreateWordPronunciationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWordSynonymDto)
  synonyms?: CreateWordSynonymDto[];
}
