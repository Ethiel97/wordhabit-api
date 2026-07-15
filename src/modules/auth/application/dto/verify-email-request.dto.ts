import { IsNumberString, Length } from 'class-validator';
import { VERIFICATION_CODE_LENGTH } from '../../domain/email-verification.policy';

export class VerifyEmailRequestDto {
  @IsNumberString()
  @Length(VERIFICATION_CODE_LENGTH, VERIFICATION_CODE_LENGTH)
  code!: string;
}
