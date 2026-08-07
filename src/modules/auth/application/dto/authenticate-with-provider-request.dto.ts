import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuthProvider } from '../../domain/entities/auth-provider';

export class AuthenticateWithProviderRequestDto {
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /**
   * Apple only ever hands the name to the client, once. Optional because
   * Google puts it in the token and returning users have an account
   * already.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
