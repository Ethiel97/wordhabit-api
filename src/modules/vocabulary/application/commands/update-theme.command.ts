import { Command } from '@nestjs/cqrs';
import { Theme } from '../../domain/entities/theme';

export class UpdateThemeCommand extends Command<Theme> {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly description?: string | null,
  ) {
    super();
  }
}
