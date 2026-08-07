import { BackfillQuizMaterialHandler } from './backfill-quiz-material.handler';
import { BackfillQuizMaterialCommand } from '../commands/backfill-quiz-material.command';
import type {
  GeneratedQuizMaterialBatch,
  VocabularyGenerationProvider,
} from '../../domain/providers/vocabulary-generation.provider';
import type {
  QuizBackfillWord,
  VocabularyRepository,
} from '../../../vocabulary/domain/repositories/vocabulary.repository';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { VocabularyGenerationQuotaExceededError } from '../../domain/errors/vocabulary-generation-quota-exceeded.error';

const word = (term: string): QuizBackfillWord => ({
  wordId: `id-${term}`,
  term,
  targetLanguage: LanguageCode.EN,
  partOfSpeech: PartOfSpeech.NOUN,
  difficulty: WordDifficulty.INTERMEDIATE,
  definitions: [{ explanationLanguage: LanguageCode.EN, text: `def ${term}` }],
  examples: [{ sentence: `An example with ${term}.` }],
});

const scenario = (distractorCount = 3) => ({
  language: LanguageCode.EN,
  situation: 'A colleague misreads a message.',
  question: 'What would you naturally say?',
  correct: 'The right usage.',
  distractors: Array.from({ length: distractorCount }, (_, i) => `wrong ${i}`),
});

class FakeRepository implements Partial<VocabularyRepository> {
  constructor(private readonly words: QuizBackfillWord[]) {}

  attached: Array<{ wordId: string; scenarios: number; antonyms: number }> = [];

  findWordsMissingQuizScenarios = ({ limit }: { limit: number }) =>
    Promise.resolve(this.words.slice(0, limit));

  attachQuizMaterial = (params: {
    wordId: string;
    antonyms: { value: string }[];
    quizScenarios: unknown[];
  }) => {
    this.attached.push({
      wordId: params.wordId,
      scenarios: params.quizScenarios.length,
      antonyms: params.antonyms.length,
    });
    return Promise.resolve();
  };
}

const handlerFor = (
  repository: FakeRepository,
  generate: () => Promise<GeneratedQuizMaterialBatch>,
) =>
  new BackfillQuizMaterialHandler(
    {
      generateQuizMaterial: generate,
    } as unknown as VocabularyGenerationProvider,
    repository as unknown as VocabularyRepository,
  );

describe('BackfillQuizMaterialHandler', () => {
  it('matches material to words by term, however the model ordered it', async () => {
    const repository = new FakeRepository([word('ubiquitous'), word('candid')]);
    const handler = handlerFor(repository, () =>
      Promise.resolve({
        items: [
          // Reversed, re-cased, re-spaced: everything an echo can distort.
          { term: '  Candid ', antonyms: [], quizScenarios: [scenario()] },
          {
            term: 'UBIQUITOUS',
            antonyms: [{ value: 'rare' }],
            quizScenarios: [scenario(), scenario()],
          },
        ],
      }),
    );

    const result = await handler.execute(new BackfillQuizMaterialCommand(10));

    expect(result.enrichedCount).toBe(2);
    expect(repository.attached).toEqual([
      { wordId: 'id-ubiquitous', scenarios: 2, antonyms: 1 },
      { wordId: 'id-candid', scenarios: 1, antonyms: 0 },
    ]);
  });

  it('leaves a word for the next run rather than mark it done empty-handed', async () => {
    // Writing zero scenarios would pull the word out of the finder's
    // sight with nothing gained — the failure mode this test pins down.
    const repository = new FakeRepository([word('sonder'), word('petrichor')]);
    const handler = handlerFor(repository, () =>
      Promise.resolve({
        items: [
          // sonder: absent from the response entirely.
          // petrichor: present, but every scenario is unusable.
          { term: 'petrichor', antonyms: [], quizScenarios: [scenario(1)] },
        ],
      }),
    );

    const result = await handler.execute(new BackfillQuizMaterialCommand(10));

    expect(result.skippedCount).toBe(2);
    expect(repository.attached).toHaveLength(0);
  });

  it('drops thin scenarios but keeps the word when better ones remain', async () => {
    const repository = new FakeRepository([word('limpid')]);
    const handler = handlerFor(repository, () =>
      Promise.resolve({
        items: [
          {
            term: 'limpid',
            antonyms: [],
            quizScenarios: [scenario(1), scenario(3)],
          },
        ],
      }),
    );

    await handler.execute(new BackfillQuizMaterialCommand(10));

    expect(repository.attached).toEqual([
      { wordId: 'id-limpid', scenarios: 1, antonyms: 0 },
    ]);
  });

  it('fails one chunk without losing the run', async () => {
    // 11 words = two chunks at a batch size of 10. The first provider
    // call dies; the second must still land.
    const words = Array.from({ length: 11 }, (_, i) => word(`w${i}`));
    const repository = new FakeRepository(words);
    let call = 0;
    const handler = handlerFor(repository, () => {
      call++;
      if (call === 1) return Promise.reject(new Error('boom'));
      return Promise.resolve({
        items: [{ term: 'w10', antonyms: [], quizScenarios: [scenario()] }],
      });
    });

    const result = await handler.execute(new BackfillQuizMaterialCommand(20));

    expect(result.failedCount).toBe(10);
    expect(result.enrichedCount).toBe(1);
  });

  it('lets a spent quota escape to the queue, which knows not to retry', async () => {
    const repository = new FakeRepository([word('w')]);
    const handler = handlerFor(repository, () =>
      Promise.reject(
        new VocabularyGenerationQuotaExceededError(
          new Error('insufficient_quota'),
        ),
      ),
    );

    await expect(
      handler.execute(new BackfillQuizMaterialCommand(10)),
    ).rejects.toBeInstanceOf(VocabularyGenerationQuotaExceededError);
  });
});
