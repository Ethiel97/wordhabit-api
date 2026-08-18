import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  BackfillDefinitionsCommand,
  BackfillDefinitionsItemResult,
  BackfillDefinitionsResult,
} from '../commands/backfill-definitions.command';
import {
  MAX_DEFINITION_BATCH_SIZE,
  VOCABULARY_GENERATION_PROVIDER,
  type GeneratedDefinitionsItem,
  type VocabularyGenerationProvider,
} from '../../domain/providers/vocabulary-generation.provider';
import {
  VOCABULARY_REPOSITORY,
  type QuizBackfillWord,
  type VocabularyRepository,
} from '../../../vocabulary/domain/repositories/vocabulary.repository';
import { VocabularyGenerationQuotaExceededError } from '../../domain/errors/vocabulary-generation-quota-exceeded.error';

@CommandHandler(BackfillDefinitionsCommand)
export class BackfillDefinitionsHandler implements ICommandHandler<
  BackfillDefinitionsCommand,
  BackfillDefinitionsResult
> {
  private readonly logger = new Logger(BackfillDefinitionsHandler.name);

  constructor(
    @Inject(VOCABULARY_GENERATION_PROVIDER)
    private readonly generationProvider: VocabularyGenerationProvider,

    @Inject(VOCABULARY_REPOSITORY)
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  async execute(
    command: BackfillDefinitionsCommand,
  ): Promise<BackfillDefinitionsResult> {
    const words = await this.vocabularyRepository.findWordsMissingDefinition({
      targetLanguage: command.targetLanguage,
      explanationLanguage: command.explanationLanguage,
      limit: command.count,
    });

    const items: BackfillDefinitionsItemResult[] = [];

    // Chunked so one bad provider call costs a chunk, not the run.
    for (
      let offset = 0;
      offset < words.length;
      offset += MAX_DEFINITION_BATCH_SIZE
    ) {
      const chunk = words.slice(offset, offset + MAX_DEFINITION_BATCH_SIZE);
      items.push(...(await this.enrichChunk(chunk, command)));
    }

    const result: BackfillDefinitionsResult = {
      remaining: words.length,
      requestedCount: command.count,
      enrichedCount: items.filter((item) => item.status === 'ENRICHED').length,
      skippedCount: items.filter((item) => item.status === 'SKIPPED').length,
      failedCount: items.filter((item) => item.status === 'FAILED').length,
      items,
    };

    this.logger.log(
      `Definition backfill ${command.targetLanguage}/${command.explanationLanguage}: ` +
        `${result.enrichedCount} enriched, ${result.skippedCount} skipped, ` +
        `${result.failedCount} failed (of ${words.length} still missing it)`,
    );

    return result;
  }

  private async enrichChunk(
    chunk: QuizBackfillWord[],
    command: BackfillDefinitionsCommand,
  ): Promise<BackfillDefinitionsItemResult[]> {
    let generated: GeneratedDefinitionsItem[];
    try {
      ({ items: generated } = await this.generationProvider.generateDefinitions(
        {
          words: chunk,
          explanationLanguage: command.explanationLanguage,
        },
      ));
    } catch (error) {
      // A spent quota must surface to the queue, which knows a retry is
      // pointless; anything else fails just this chunk.
      if (error instanceof VocabularyGenerationQuotaExceededError) {
        throw error;
      }
      return chunk.map((word) => ({
        term: word.term,
        status: 'FAILED' as const,
        reason: error instanceof Error ? error.message : String(error),
      }));
    }

    // The model echoes each term; matching on it survives reordering
    // and dropped entries alike.
    const byTerm = new Map(
      generated.map((item) => [this.normalize(item.term), item]),
    );

    const results: BackfillDefinitionsItemResult[] = [];
    for (const word of chunk) {
      const item = byTerm.get(this.normalize(word.term));

      // Only the language asked for. A model that answers in the
      // word's own language instead would otherwise satisfy the finder
      // while leaving the reader exactly where they were.
      const definitions = (item?.definitions ?? []).filter(
        (definition) =>
          definition.explanationLanguage === command.explanationLanguage &&
          definition.text.trim().length > 0,
      );

      if (definitions.length === 0) {
        results.push({
          term: word.term,
          status: 'SKIPPED',
          reason: item
            ? `No ${command.explanationLanguage} definition in the response.`
            : 'Term missing from the response.',
        });
        continue;
      }

      try {
        const written = await this.vocabularyRepository.attachDefinitions({
          wordId: word.wordId,
          definitions,
        });
        results.push({
          term: word.term,
          // Zero written means another run got there first, which is a
          // no-op rather than a failure.
          status: written > 0 ? 'ENRICHED' : 'SKIPPED',
          reason: written > 0 ? undefined : 'Already held by a concurrent run.',
        });
      } catch (error) {
        results.push({
          term: word.term,
          status: 'FAILED',
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  private normalize(term: string): string {
    return term.trim().toLowerCase();
  }
}
