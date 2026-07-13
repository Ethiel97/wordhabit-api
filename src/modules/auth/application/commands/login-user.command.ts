import { Command } from '@nestjs/cqrs';

export type LoginUserResult = {
  user: {
    id: string;
    email: string;
    username: string;
  };
  accessToken: string;
};

export class LoginUserCommand extends Command<LoginUserResult> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}
