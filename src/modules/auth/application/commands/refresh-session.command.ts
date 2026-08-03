import { Command } from '@nestjs/cqrs';

export type RefreshSessionResult = {
  accessToken: string;
  refreshToken: string;
};

export class RefreshSessionCommand extends Command<RefreshSessionResult> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
