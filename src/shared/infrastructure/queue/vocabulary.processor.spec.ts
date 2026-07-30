import { Job, UnrecoverableError } from 'bullmq';
import { CommandBus } from '@nestjs/cqrs';
import { GenerateVocabularyBatchProcessor } from './vocabulary.processor';
import { GENERATE_VOCABULARY_BATCH_JOB } from '../../../modules/vocabulary-ingestion/infrastructure/queue/vocabulary-queue.constants';
import { VocabularyGenerationQuotaExceededError } from '../../../modules/vocabulary-ingestion/domain/errors/vocabulary-generation-quota-exceeded.error';

const job = {
  name: GENERATE_VOCABULARY_BATCH_JOB,
  id: '1',
  data: { targetLanguage: 'EN', explanationLanguage: 'FR', count: 10 },
} as unknown as Job;

const processorFor = (execute: () => Promise<unknown>) =>
  new GenerateVocabularyBatchProcessor({ execute } as unknown as CommandBus);

describe('GenerateVocabularyBatchProcessor', () => {
  it('gives up immediately when the quota is spent', async () => {
    // Credit does not come back between two exponential backoffs, so
    // three attempts buy nothing and raise three alerts for one cause.
    const processor = processorFor(() =>
      Promise.reject(new VocabularyGenerationQuotaExceededError()),
    );

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('lets a transient failure through so the queue retries it', async () => {
    const timeout = new Error('socket hang up');
    const processor = processorFor(() => Promise.reject(timeout));

    await expect(processor.process(job)).rejects.toBe(timeout);
  });

  it('ignores a job it does not own', async () => {
    let called = false;
    const processor = processorFor(() => {
      called = true;
      return Promise.resolve({});
    });

    await processor.process({ name: 'other', id: '2' } as unknown as Job);

    expect(called).toBe(false);
  });
});
