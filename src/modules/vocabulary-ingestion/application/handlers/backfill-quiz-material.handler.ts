import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  BackfillQuizMaterialCommand,
  BackfillQuizMaterialItemResult,
  BackfillQuizMaterialResult,
} from '../commands/backfill-quiz-material.command';
import {
  MAX_QUIZ_MATERIAL_BATCH_SIZE,
  VOCABULARY_GENERATION_PROVIDER,
  type GeneratedQuizMaterialItem,
  type VocabularyGenerationProvider,
} from '../../domain/providers/vocabulary-generation.provider';
import {
  VOCABULARY_REPOSITORY,
  type QuizBackfillWord,
  type VocabularyRepository,
} from '../../../vocabulary/domain/repositories/vocabulary.repository';
import { VocabularyGenerationQuotaExceededError } from '../../domain/errors/vocabulary-generation-quota-exceeded.error';

/**
 * Fewer distractors than this and the question answers itself.
 *
 * Enforced here rather than trusted to the prompt: schema validation
 * cannot express "at least two", and a scenario that slips through
 * reaches learners.
 */
const MIN_DISTRACTORS = 2;

@CommandHandler(BackfillQuizMaterialCommand)
export class BackfillQuizMaterialHandler implements ICommandHandler<
  BackfillQuizMaterialCommand,
  BackfillQuizMaterialResult
> {
  private readonly logger = new Logger(BackfillQuizMaterialHandler.name);

  constructor(
    @Inject(VOCABULARY_GENERATION_PROVIDER)
    private readonly generationProvider: VocabularyGenerationProvider,

    @Inject(VOCABULARY_REPOSITORY)
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  async execute(
    command: BackfillQuizMaterialCommand,
  ): Promise<BackfillQuizMaterialResult> {
    const words = await this.vocabularyRepository.findWordsMissingQuizScenarios(
      { limit: command.count },
    );

    const items: BackfillQuizMaterialItemResult[] = [];

    // Chunked so one bad provider call costs ten words, not the run.
    for (
      let offset = 0;
      offset < words.length;
      offset += MAX_QUIZ_MATERIAL_BATCH_SIZE
    ) {
      const chunk = words.slice(offset, offset + MAX_QUIZ_MATERIAL_BATCH_SIZE);
      items.push(...(await this.enrichChunk(chunk)));
    }

    const result: BackfillQuizMaterialResult = {
      remaining: words.length,
      requestedCount: command.count,
      enrichedCount: items.filter((item) => item.status === 'ENRICHED').length,
      skippedCount: items.filter((item) => item.status === 'SKIPPED').length,
      failedCount: items.filter((item) => item.status === 'FAILED').length,
      items,
    };

    this.logger.log(
      `Backfill: ${result.enrichedCount} enriched, ` +
        `${result.skippedCount} skipped, ${result.failedCount} failed ` +
        `(of ${words.length} still missing scenarios)`,
    );

    return result;
  }

  private async enrichChunk(
    chunk: QuizBackfillWord[],
  ): Promise<BackfillQuizMaterialItemResult[]> {
    let generated: GeneratedQuizMaterialItem[];
    try {
      ({ items: generated } =
        await this.generationProvider.generateQuizMaterial({ words: chunk }));
    } catch (error) {
      // A spent quota must surface to the queue, which knows a retry is
      // pointless; anything else fails just this chunk and the run
      // moves on.
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

    const results: BackfillQuizMaterialItemResult[] = [];
    for (const word of chunk) {
      const material = byTerm.get(this.normalize(word.term));

      const scenarios = (material?.quizScenarios ?? []).filter(
        (scenario) => scenario.distractors.length >= MIN_DISTRACTORS,
      );

      if (scenarios.length === 0) {
        // Left for the next run rather than marked done: writing zero
        // scenarios would take the word out of the finder's sight with
        // nothing to show for it.
        results.push({
          term: word.term,
          status: 'SKIPPED',
          reason: material
            ? 'No usable scenario in the response.'
            : 'Term missing from the response.',
        });
        continue;
      }

      try {
        await this.vocabularyRepository.attachQuizMaterial({
          wordId: word.wordId,
          antonyms: material?.antonyms ?? [],
          quizScenarios: scenarios,
        });
        results.push({ term: word.term, status: 'ENRICHED' });
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
