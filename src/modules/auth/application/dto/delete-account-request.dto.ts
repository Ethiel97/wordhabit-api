import { AccountDeletionReason } from '../../domain/entities/account-deletion-reason';
import { IsEnum, IsOptional } from 'class-validator';

export class DeleteAccountRequestDto {
  @IsOptional()
  @IsEnum(AccountDeletionReason)
  reason?: AccountDeletionReason;
}
