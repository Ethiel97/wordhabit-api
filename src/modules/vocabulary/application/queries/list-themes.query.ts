import { Query } from '@nestjs/cqrs';
import { Theme } from '../../domain/entities/theme';

export class ListThemesQuery extends Query<Theme[]> {}
