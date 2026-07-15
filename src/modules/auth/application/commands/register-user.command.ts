import { Command } from '@nestjs/cqrs';

export type RegisterUserResult = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
  accessToken: string;
};

export class RegisterUserCommand extends Command<RegisterUserResult> {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
  ) {
    super();
  }
}
