import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
