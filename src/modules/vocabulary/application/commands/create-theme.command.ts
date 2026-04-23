import { Command } from '@nestjs/cqrs';
import { Theme } from '../../domain/entities/theme';

export class CreateThemeCommand extends Command<Theme> {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly description?: string | null,
  ) {
    super();
  }
}
