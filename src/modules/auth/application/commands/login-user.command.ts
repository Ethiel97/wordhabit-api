import { Command } from '@nestjs/cqrs';

export type LoginUserResult = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
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
