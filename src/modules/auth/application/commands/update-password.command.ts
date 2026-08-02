import { Command } from '@nestjs/cqrs';
import { LoginUserResult } from './login-user.command';

export class UpdatePasswordCommand extends Command<UpdatePasswordResult> {
  constructor(
    public readonly userId: string,
    public readonly oldPassword: string,
    public readonly newPassword: string,
  ) {
    super();
  }
}

export type UpdatePasswordResult = LoginUserResult;
