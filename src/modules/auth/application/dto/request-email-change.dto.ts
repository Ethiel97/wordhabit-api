import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail({}, { message: 'newEmail must be a valid email address' })
  newEmail!: string;

  /** Re-authentication: a live session is not enough to move an account. */
  @IsString()
  @MinLength(1)
  currentPassword!: string;
}
