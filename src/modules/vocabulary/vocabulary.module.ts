import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VocabularyController } from './presentation/http/vocabulary-controller/vocabulary.controller';
import { ThemeController } from './presentation/http/theme-controller/theme.controller';
import { PrismaVocabularyRepository } from './infrastructure/persistence/prisma-vocabulary.repository';
import { PrismaThemeRepository } from './infrastructure/persistence/prisma-theme.repository';
import { VOCABULARY_REPOSITORY } from './domain/repositories/vocabulary.repository';
import { THEME_REPOSITORY } from './domain/repositories/theme.repository';
import { THEME_LOOKUP_PORT } from '../../shared/application/ports/theme-lookup.port';
import { CreateVocabularyWordHandler } from './application/handlers/create-vocabulary-word.handler';
import { GetVocabularyWordByIdHandler } from './application/handlers/get-vocabulary-word-by-id.handler';
import { GetVocabularyWordByTermHandler } from './application/handlers/get-vocabulary-word-by-term.handler';
import { ListVocabularyWordsHandler } from './application/handlers/list-vocabulary-words.handler';
import { CreateThemeHandler } from './application/handlers/create-theme.handler';
import { UpdateThemeHandler } from './application/handlers/update-theme.handler';
import { DeleteThemeHandler } from './application/handlers/delete-theme.handler';
import { ListThemesHandler } from './application/handlers/list-themes.handler';
import { GetThemeBySlugHandler } from './application/handlers/get-theme-by-slug.handler';

const commandHandlers = [
  CreateVocabularyWordHandler,
  CreateThemeHandler,
  UpdateThemeHandler,
  DeleteThemeHandler,
];

const queryHandlers = [
  GetVocabularyWordByIdHandler,
  GetVocabularyWordByTermHandler,
  ListVocabularyWordsHandler,
  ListThemesHandler,
  GetThemeBySlugHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [VocabularyController, ThemeController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    PrismaVocabularyRepository,
    PrismaThemeRepository,
    {
      provide: VOCABULARY_REPOSITORY,
      useExisting: PrismaVocabularyRepository,
    },
    {
      provide: THEME_REPOSITORY,
      useExisting: PrismaThemeRepository,
    },
    {
      provide: THEME_LOOKUP_PORT,
      useExisting: PrismaThemeRepository,
    },
  ],
  exports: [THEME_LOOKUP_PORT, THEME_REPOSITORY],
})
export class VocabularyModule {}
