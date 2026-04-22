import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VocabularyController } from './presentation/http/vocabulary-controller/vocabulary.controller';
import { PrismaVocabularyRepository } from './infrastructure/persistence/prisma-vocabulary.repository';
import { VOCABULARY_REPOSITORY } from './domain/repositories/vocabulary.repository';
import { CreateVocabularyWordHandler } from './application/handlers/create-vocabulary-word.handler';
import { GetVocabularyWordByIdHandler } from './application/handlers/get-vocabulary-word-by-id.handler';
import { GetVocabularyWordByTermHandler } from './application/handlers/get-vocabulary-word-by-term.handler';
import { ListVocabularyWordsHandler } from './application/handlers/list-vocabulary-words.handler';

const commandHandlers = [CreateVocabularyWordHandler];

const queryHandlers = [
  GetVocabularyWordByIdHandler,
  GetVocabularyWordByTermHandler,
  ListVocabularyWordsHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [VocabularyController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    PrismaVocabularyRepository,
    {
      provide: VOCABULARY_REPOSITORY,
      useExisting: PrismaVocabularyRepository,
    },
  ],
})
export class VocabularyModule {}
