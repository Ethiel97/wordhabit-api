import { IsString, MinLength } from 'class-validator';

export class RefreshSessionRequestDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
