import { IsString, Length } from 'class-validator';
import { VERIFICATION_CODE_LENGTH } from '../../domain/email-verification.policy';

export class ConfirmEmailChangeDto {
  @IsString()
  @Length(VERIFICATION_CODE_LENGTH, VERIFICATION_CODE_LENGTH)
  code!: string;
}
