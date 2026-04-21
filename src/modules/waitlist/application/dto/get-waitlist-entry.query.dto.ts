import { IsEmail } from 'class-validator';

export class GetWaitlistEntryQueryDto {
  @IsEmail()
  email!: string;
}
