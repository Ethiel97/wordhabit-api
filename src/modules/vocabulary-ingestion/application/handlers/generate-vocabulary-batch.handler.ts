import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type {
  GenerateVocabularyBatchItemResult,
  GenerateVocabularyBatchResult,
} from '../commands/generate-vocabulary-batch.command';
import { GenerateVocabularyBatchCommand } from '../commands/generate-vocabulary-batch.command';
import {
  MAX_VOCABULARY_BATCH_SIZE,
  VOCABULARY_GENERATION_PROVIDER,
  type VocabularyGenerationProvider,
} from '../../domain/providers/vocabulary-generation.provider';
import {
  CreateVocabularyWordCommand,
  CreateVocabularyWordResult,
} from '../../../vocabulary/application/commands/create-vocabulary-word.command';

import type { ThemeRepository } from '../../../vocabulary/domain/repositories/theme.repository';
import { THEME_REPOSITORY } from '../../../vocabulary/domain/repositories/theme.repository';
import type { VocabularyRepository } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import { VOCABULARY_REPOSITORY } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import {
  buildExplorationBrief,
  CORPUS_TARGET_PER_LANGUAGE,
} from '../../domain/exploration-brief';
import { rejectLowQualityItems } from '../../domain/generated-item-quality';

/**
 * How many already-known terms to show the model.
 *
 * Enough to convey the territory taken, small enough to stay a rounding
 * error against a 24k-token completion.
 */
const EXCLUDED_TERMS_SAMPLE_SIZE = 400;

@CommandHandler(GenerateVocabularyBatchCommand)
export class GenerateVocabularyBatchHandler implements ICommandHandler<
  GenerateVocabularyBatchCommand,
  GenerateVocabularyBatchResult
> {
  private readonly logger = new Logger(GenerateVocabularyBatchHandler.name);

  constructor(
    @Inject(VOCABULARY_GENERATION_PROVIDER)
    private readonly generationProvider: VocabularyGenerationProvider,
    private readonly commandBus: CommandBus,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
    @Inject(VOCABULARY_REPOSITORY)
    private readonly vocabularyRepository: VocabularyRepository,
  ) {}

  async findThemeSlugs(): Promise<string[]> {
    return await this.themeRepository
      .list()
      .then((themes) => themes.map((theme) => theme.slug));
  }

  async execute(
    command: GenerateVocabularyBatchCommand,
  ): Promise<GenerateVocabularyBatchResult> {
    // The corpus is built once and served forever, so generation has a
    // finish line. Checked before anything else: the cheapest call is
    // the one not made, and the nightly job would otherwise keep buying
    // words nobody can reach.
    const corpusSize = await this.vocabularyRepository.countWords({
      targetLanguage: command.targetLanguage,
    });

    if (corpusSize >= CORPUS_TARGET_PER_LANGUAGE) {
      this.logger.log(
        `${command.targetLanguage} corpus is at ${corpusSize}/${CORPUS_TARGET_PER_LANGUAGE} — skipping generation.`,
      );
      return {
        requestedCount: command.count,
        generatedCount: 0,
        createdCount: 0,
        skippedCount: 0,
        failedCount: 0,
        items: [],
      };
    }

    const allowedThemeSlugs = await this.findThemeSlugs();

    // Without this the model rediscovers its own favourites every night:
    // the uniqueness check then rejects them one by one, so the corpus
    // stops growing while the generation bill keeps running.
    const excludedTerms = await this.vocabularyRepository.sampleNormalizedTerms(
      {
        targetLanguage: command.targetLanguage,
        limit: EXCLUDED_TERMS_SAMPLE_SIZE,
      },
    );

    // Capped here rather than only in the provider: the brief's
    // difficulty split has to add up to the count actually generated.
    const count = Math.min(command.count, MAX_VOCABULARY_BATCH_SIZE);

    // Themes are what a user picks at onboarding and what the daily word
    // is filtered by, so a theme nobody generates for is a promise the
    // app cannot keep. Three at a time: enough to steer, few enough that
    // the semantic field still leads.
    const underCoveredThemes =
      await this.vocabularyRepository.findLeastCoveredThemes({
        targetLanguage: command.targetLanguage,
        limit: 3,
      });

    const generated = await this.generationProvider.generateVocabularyBatch({
      targetLanguage: command.targetLanguage,
      explanationLanguage: command.explanationLanguage,
      count,
      allowedThemeSlugs,
      excludedTerms,
      underCoveredThemes,
      brief: buildExplorationBrief({
        targetLanguage: command.targetLanguage,
        count,
        on: new Date(),
      }),
    });

    const { accepted, rejected } = rejectLowQualityItems(generated.items);

    const results: GenerateVocabularyBatchItemResult[] = rejected.map(
      (rejection) => ({
        term: rejection.term,
        status: 'FAILED_VALIDATION' as const,
        reason: rejection.reason,
      }),
    );

    for (const item of accepted) {
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
            new CreateVocabularyWordCommand({
              term: item.term,
              targetLanguage: item.targetLanguage,
              difficulty: item.difficulty,
              partOfSpeech: item.partOfSpeech,
              definitions: item.definitions,
              examples: item.examples ?? [],
              pronunciations: item.pronunciations ?? [],
              synonyms: item.synonyms ?? [],
              themeSlugs: item.themeSlugs ?? [],
            }),
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
