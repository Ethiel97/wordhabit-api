import { BackfillDefinitionsHandler } from './backfill-definitions.handler';
import { BackfillDefinitionsCommand } from '../commands/backfill-definitions.command';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { VocabularyGenerationQuotaExceededError } from '../../domain/errors/vocabulary-generation-quota-exceeded.error';
import type {
  GeneratedDefinitionsBatch,
  VocabularyGenerationProvider,
} from '../../domain/providers/vocabulary-generation.provider';
import type {
  QuizBackfillWord,
  VocabularyRepository,
} from '../../../vocabulary/domain/repositories/vocabulary.repository';

const word = (term: string): QuizBackfillWord => ({
  wordId: `id-${term}`,
  term,
  targetLanguage: LanguageCode.EN,
  partOfSpeech: PartOfSpeech.ADJECTIVE,
  difficulty: WordDifficulty.INTERMEDIATE,
  definitions: [
    { explanationLanguage: LanguageCode.FR, text: 'partout à la fois' },
  ],
  examples: [{ sentence: 'Screens are ubiquitous now.' }],
});

type Attached = {
  wordId: string;
  definitions: { explanationLanguage: LanguageCode; text: string }[];
};

function harness(options: {
  words: QuizBackfillWord[];
  generate: () => Promise<GeneratedDefinitionsBatch>;
  written?: number;
}) {
  const attached: Attached[] = [];

  const provider = {
    generateDefinitions: options.generate,
  } as unknown as VocabularyGenerationProvider;

  const repository = {
    findWordsMissingDefinition: () => Promise.resolve(options.words),
    attachDefinitions: (params: Attached) => {
      attached.push(params);
      return Promise.resolve(options.written ?? params.definitions.length);
    },
  } as unknown as VocabularyRepository;

  return {
    attached,
    handler: new BackfillDefinitionsHandler(provider, repository),
  };
}

const command = new BackfillDefinitionsCommand(
  LanguageCode.EN,
  LanguageCode.EN,
  10,
);

describe('BackfillDefinitionsHandler', () => {
  it('writes the definition the reader was missing', async () => {
    const { handler, attached } = harness({
      words: [word('ubiquitous')],
      generate: () =>
        Promise.resolve({
          items: [
            {
              term: 'ubiquitous',
              definitions: [
                {
                  explanationLanguage: LanguageCode.EN,
                  text: 'So common you stop noticing it.',
                },
              ],
            },
          ],
        }),
    });

    const result = await handler.execute(command);

    expect(result.enrichedCount).toBe(1);
    expect(attached).toHaveLength(1);
    expect(attached[0].definitions[0].text).toContain('stop noticing');
  });

  it('drops a definition returned in the wrong language', async () => {
    // The failure that would otherwise be invisible: the word leaves
    // the finder's sight while the reader is exactly where they were.
    const { handler, attached } = harness({
      words: [word('ubiquitous')],
      generate: () =>
        Promise.resolve({
          items: [
            {
              term: 'ubiquitous',
              definitions: [
                {
                  explanationLanguage: LanguageCode.FR,
                  text: 'omniprésent',
                },
              ],
            },
          ],
        }),
    });

    const result = await handler.execute(command);

    expect(attached).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
    expect(result.items[0].reason).toContain('EN definition');
  });

  it('matches on the echoed term, so reordering is harmless', async () => {
    const { handler, attached } = harness({
      words: [word('alpha'), word('beta')],
      generate: () =>
        Promise.resolve({
          items: [
            {
              term: 'BETA ',
              definitions: [
                { explanationLanguage: LanguageCode.EN, text: 'second' },
              ],
            },
            {
              term: 'alpha',
              definitions: [
                { explanationLanguage: LanguageCode.EN, text: 'first' },
              ],
            },
          ],
        }),
    });

    await handler.execute(command);

    expect(attached.map((row) => row.wordId)).toEqual(['id-alpha', 'id-beta']);
    expect(attached[1].definitions[0].text).toBe('second');
  });

  it('skips a term the response left out', async () => {
    const { handler } = harness({
      words: [word('ubiquitous')],
      generate: () => Promise.resolve({ items: [] }),
    });

    const result = await handler.execute(command);

    expect(result.skippedCount).toBe(1);
    expect(result.items[0].reason).toContain('missing from the response');
  });

  it('counts a concurrent run as skipped, not enriched', async () => {
    const { handler } = harness({
      words: [word('ubiquitous')],
      written: 0,
      generate: () =>
        Promise.resolve({
          items: [
            {
              term: 'ubiquitous',
              definitions: [
                { explanationLanguage: LanguageCode.EN, text: 'everywhere' },
              ],
            },
          ],
        }),
    });

    const result = await handler.execute(command);

    expect(result.enrichedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('fails the chunk on a provider error without losing the run', async () => {
    const { handler } = harness({
      words: [word('ubiquitous')],
      generate: () => Promise.reject(new Error('upstream exploded')),
    });

    const result = await handler.execute(command);

    expect(result.failedCount).toBe(1);
    expect(result.items[0].reason).toBe('upstream exploded');
  });

  it('lets a spent quota reach the queue', async () => {
    // The queue turns this into an unrecoverable job; swallowing it
    // would retry three times against an account with no credit.
    const { handler } = harness({
      words: [word('ubiquitous')],
      generate: () =>
        Promise.reject(new VocabularyGenerationQuotaExceededError('no credit')),
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      VocabularyGenerationQuotaExceededError,
    );
  });
});
