import { CommandBus } from '@nestjs/cqrs';
import { GenerateVocabularyBatchHandler } from './generate-vocabulary-batch.handler';
import { GenerateVocabularyBatchCommand } from '../commands/generate-vocabulary-batch.command';
import { CORPUS_TARGET_PER_LANGUAGE } from '../../domain/exploration-brief';
import type { ThemeRepository } from '../../../vocabulary/domain/repositories/theme.repository';
import type { VocabularyRepository } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

class SpyGenerationProvider {
  calls = 0;

  generateVocabularyBatch = () => {
    this.calls++;
    return Promise.resolve({ items: [] });
  };

  generateQuizMaterial = () => Promise.resolve({ items: [] });
}

const handlerFor = (corpusSize: number, provider: SpyGenerationProvider) =>
  new GenerateVocabularyBatchHandler(
    provider,
    { execute: () => Promise.resolve({ id: 'w1' }) } as unknown as CommandBus,
    {
      list: () => Promise.resolve([{ slug: 'general' }]),
    } as unknown as ThemeRepository,
    {
      countWords: () => Promise.resolve(corpusSize),
      sampleNormalizedTerms: () => Promise.resolve([]),
      findLeastCoveredThemes: () => Promise.resolve([]),
    } as unknown as VocabularyRepository,
  );

describe('GenerateVocabularyBatchHandler', () => {
  const command = new GenerateVocabularyBatchCommand(
    LanguageCode.EN,
    LanguageCode.FR,
    10,
  );

  it('generates while the corpus is below target', async () => {
    const provider = new SpyGenerationProvider();

    await handlerFor(CORPUS_TARGET_PER_LANGUAGE - 1, provider).execute(command);

    expect(provider.calls).toBe(1);
  });

  it('stops calling the model once the corpus is full', async () => {
    // The point of the ceiling: the cheapest generation is the one not
    // made. A nightly job with no finish line keeps paying for words
    // nobody can reach.
    const provider = new SpyGenerationProvider();

    const result = await handlerFor(
      CORPUS_TARGET_PER_LANGUAGE,
      provider,
    ).execute(command);

    expect(provider.calls).toBe(0);
    expect(result).toEqual({
      requestedCount: 10,
      generatedCount: 0,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      items: [],
    });
  });
});
