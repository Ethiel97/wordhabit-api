import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SetUserLearningProfileThemesRequestDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  themeSlugs!: string[];
}
