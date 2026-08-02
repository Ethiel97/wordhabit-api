import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordRequestDto {
  @IsString()
  oldPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword!: string;
}
