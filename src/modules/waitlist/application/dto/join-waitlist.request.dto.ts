import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinWaitlistRequestDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
