import { Query } from '@nestjs/cqrs';
import { Theme } from '../../domain/entities/theme';

export class GetThemeBySlugQuery extends Query<Theme | null> {
  constructor(public readonly slug: string) {
    super();
  }
}
