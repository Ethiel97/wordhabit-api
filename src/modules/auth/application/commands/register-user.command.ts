import { Command } from '@nestjs/cqrs';

export type RegisterUserResult = {
  user: {
    id: string;
    email: string;
    username: string;
  };
  accessToken: string;
};

export class RegisterUserCommand extends Command<RegisterUserResult> {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
  ) {
    super();
  }
}
