import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type {
  GenerateVocabularyBatchItemResult,
  GenerateVocabularyBatchResult,
} from '../commands/generate-vocabulary-batch.command';
import { GenerateVocabularyBatchCommand } from '../commands/generate-vocabulary-batch.command';
import {
  VOCABULARY_GENERATION_PROVIDER,
  type VocabularyGenerationProvider,
} from '../../domain/providers/vocabulary-generation.provider';
import {
  CreateVocabularyWordCommand,
  CreateVocabularyWordResult,
} from '../../../vocabulary/application/commands/create-vocabulary-word.command';

@CommandHandler(GenerateVocabularyBatchCommand)
export class GenerateVocabularyBatchHandler implements ICommandHandler<
  GenerateVocabularyBatchCommand,
  GenerateVocabularyBatchResult
> {
  constructor(
    @Inject(VOCABULARY_GENERATION_PROVIDER)
    private readonly generationProvider: VocabularyGenerationProvider,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: GenerateVocabularyBatchCommand,
  ): Promise<GenerateVocabularyBatchResult> {
    const generated = await this.generationProvider.generateVocabularyBatch({
      targetLanguage: command.targetLanguage,
      explanationLanguage: command.explanationLanguage,
      count: command.count,
      theme: command.theme,
    });

    const results: GenerateVocabularyBatchItemResult[] = [];

    for (const item of generated.items) {
      try {
        if (!item.term?.trim()) {
          results.push({
            term: '',
            status: 'FAILED_VALIDATION',
            reason: 'Missing term.',
          });
          continue;
        }

        if (!item.definitions?.length) {
          results.push({
            term: item.term,
            status: 'FAILED_VALIDATION',
            reason: 'Missing definitions.',
          });
          continue;
        }

        const created: CreateVocabularyWordResult =
          await this.commandBus.execute(
            new CreateVocabularyWordCommand(
              item.term,
              item.targetLanguage,
              item.difficulty,
              item.partOfSpeech,
              item.definitions,
              item.examples ?? [],
              item.pronunciations ?? [],
              item.synonyms ?? [],
            ),
          );

        results.push({
          term: item.term,
          status: 'CREATED',
          wordId: created.id,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown batch item error';

        if (message.toLowerCase().includes('already exists')) {
          results.push({
            term: item.term,
            status: 'SKIPPED_DUPLICATE',
            reason: message,
          });
          continue;
        }

        results.push({
          term: item.term,
          status: 'FAILED',
          reason: message,
        });
      }
    }

    const createdCount = results.filter((r) => r.status === 'CREATED').length;
    const skippedCount = results.filter(
      (r) => r.status === 'SKIPPED_DUPLICATE',
    ).length;
    const failedCount = results.filter(
      (r) => r.status === 'FAILED' || r.status === 'FAILED_VALIDATION',
    ).length;

    return {
      requestedCount: command.count,
      generatedCount: generated.items.length,
      createdCount,
      skippedCount,
      failedCount,
      items: results,
    };
  }
}
