import { Queue } from 'bullmq';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import {
  BACKFILL_DEFINITIONS_JOB,
  GENERATE_VOCABULARY_BATCH_JOB,
} from '../../infrastructure/queue/vocabulary-queue.constants';
import { BackfillDefinitionsRequestDto } from '../dto/backfill-definitions.request.dto';
import {
  DEFINITION_BACKFILL_PAIRS,
  VocabularyDailyScheduler,
} from './vocabulary-daily.scheduler';

describe('VocabularyDailyScheduler', () => {
  const add = jest.fn().mockResolvedValue(undefined);
  const scheduler = new VocabularyDailyScheduler({ add } as unknown as Queue);

  beforeEach(() => add.mockClear());

  it('backfills definitions for every target language, common pairs first', async () => {
    await scheduler.enqueueDefinitionBackfill();

    const jobs = (
      add.mock.calls as Array<
        [string, BackfillDefinitionsRequestDto, { jobId: string }]
      >
    ).map(([name, data, options]) => ({ name, data, jobId: options.jobId }));

    expect(jobs).toHaveLength(DEFINITION_BACKFILL_PAIRS.length);
    expect(jobs.every((job) => job.name === BACKFILL_DEFINITIONS_JOB)).toBe(
      true,
    );
    expect(jobs[0].data).toMatchObject({
      targetLanguage: LanguageCode.FR,
      explanationLanguage: LanguageCode.FR,
    });
    expect(jobs[1].data).toMatchObject({
      targetLanguage: LanguageCode.ES,
      explanationLanguage: LanguageCode.FR,
    });
    expect(new Set(jobs.map((job) => job.data.targetLanguage))).toEqual(
      new Set([LanguageCode.EN, LanguageCode.ES, LanguageCode.FR]),
    );
    expect(new Set(jobs.map((job) => job.jobId)).size).toBe(jobs.length);
    expect(jobs.map((job) => job.jobId)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^definitions-ES-FR-/)]),
    );
  });

  it('keeps enqueuing the remaining pairs when one is refused', async () => {
    add.mockRejectedValueOnce(new Error('redis down'));

    await scheduler.enqueueDefinitionBackfill();

    expect(add).toHaveBeenCalledTimes(DEFINITION_BACKFILL_PAIRS.length);
  });
});

describe('VocabularyDailyScheduler generation', () => {
  const add = jest.fn().mockResolvedValue(undefined);
  const scheduler = new VocabularyDailyScheduler({ add } as unknown as Queue);

  beforeEach(() => add.mockClear());

  it('generates fifteen French-explained English words a night', async () => {
    await scheduler.enqueueGeneration();

    expect(add).toHaveBeenCalledTimes(1);
    const [name, payload, options] = add.mock.calls[0] as [
      string,
      { targetLanguage: string; explanationLanguage: string; count: number },
      { jobId: string },
    ];
    expect(name).toBe(GENERATE_VOCABULARY_BATCH_JOB);
    expect(payload).toEqual({
      targetLanguage: LanguageCode.EN,
      explanationLanguage: LanguageCode.FR,
      count: 15,
    });
    expect(options.jobId).toMatch(/^daily-EN-FR-\d{4}-\d{2}-\d{2}$/);
  });

  it('generates thirty English-explained words once a week', async () => {
    await scheduler.enqueueWeeklyGeneration();

    expect(add).toHaveBeenCalledTimes(1);
    const [, payload, options] = add.mock.calls[0] as [
      string,
      { targetLanguage: string; explanationLanguage: string; count: number },
      { jobId: string },
    ];
    expect(payload).toEqual({
      targetLanguage: LanguageCode.EN,
      explanationLanguage: LanguageCode.EN,
      count: 30,
    });
    expect(options.jobId).toMatch(/^weekly-EN-EN-/);
  });
});
