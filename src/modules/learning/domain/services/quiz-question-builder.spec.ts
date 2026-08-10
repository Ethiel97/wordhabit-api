import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { QuizMode, QuizQuestionKind } from '../entities/quiz';
import {
  buildQuizQuestions,
  QuizDistractorWord,
  QuizTargetWord,
} from './quiz-question-builder';

const word = (overrides: Partial<QuizTargetWord> = {}): QuizTargetWord => ({
  wordId: 'w1',
  term: 'serendipity',
  partOfSpeech: PartOfSpeech.NOUN,
  definitions: ['A happy accident.', 'Luck taking the form of discovery.'],
  examples: ['Pure serendipity brought us together.'],
  synonyms: ['fluke'],
  antonyms: ['misfortune'],
  ...overrides,
});

const pool: QuizDistractorWord[] = [
  {
    term: 'melancholy',
    partOfSpeech: PartOfSpeech.NOUN,
    definitions: ['A pensive sadness.'],
    synonyms: ['gloom'],
  },
  {
    term: 'wanderlust',
    partOfSpeech: PartOfSpeech.NOUN,
    definitions: ['A strong desire to travel.'],
    synonyms: ['restlessness'],
  },
  {
    term: 'candour',
    partOfSpeech: PartOfSpeech.NOUN,
    definitions: ['Frank honesty.'],
    synonyms: ['openness'],
  },
];

const scenario = {
  situation: 'You bump into an old friend abroad.',
  question: 'What would you say?',
  correct: 'What serendipity!',
  distractors: ['I serendipitied you.', 'Such serendipity anger!'],
};

/** Deterministic "randomness": always picks the first arrangement. */
const fixed = () => 0;

describe('buildQuizQuestions', () => {
  it('keeps correctIndex honest through the shuffle', () => {
    // The one invariant everything rests on: whatever the shuffle did,
    // options[correctIndex] must be the right answer.
    for (const mode of [QuizMode.MASTERY, QuizMode.SPEED]) {
      const questions = buildQuizQuestions({
        word: word(),
        pool,
        scenarios: [scenario],
        mode,
        random: Math.random,
      });
      for (const question of questions) {
        expect(question.options[question.correctIndex]).toBeDefined();
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(question.options).size).toBe(question.options.length);
      }
    }
  });

  it('builds a full mastery round from corpus fields alone', () => {
    const questions = buildQuizQuestions({
      word: word(),
      pool,
      scenarios: [],
      mode: QuizMode.MASTERY,
      random: fixed,
    });

    const kinds = questions.map((q) => q.kind);
    expect(kinds).toEqual([
      QuizQuestionKind.MEANING,
      QuizQuestionKind.GAP_FILL,
      QuizQuestionKind.SYNONYM,
    ]);
    // The gap-fill must not leak the term it asks for.
    const gap = questions[1];
    expect(gap.prompt).toContain('_____');
    expect(gap.prompt.toLowerCase()).not.toContain('serendipity');
  });

  it('falls back to a second sense when the word has no synonyms', () => {
    const questions = buildQuizQuestions({
      word: word({ synonyms: [] }),
      pool,
      scenarios: [],
      mode: QuizMode.MASTERY,
      random: fixed,
    });

    expect(questions).toHaveLength(3);
    expect(questions[2].kind).toBe(QuizQuestionKind.MEANING);
    // The two meaning questions must test *different* senses, whatever
    // the sampling picked first.
    const first = questions[0].options[questions[0].correctIndex];
    const second = questions[2].options[questions[2].correctIndex];
    expect([
      'A happy accident.',
      'Luck taking the form of discovery.',
    ]).toContain(second);
    expect(second).not.toBe(first);
  });

  it('pits the antonym against the word’s own synonym in speed', () => {
    const questions = buildQuizQuestions({
      word: word(),
      pool,
      scenarios: [],
      mode: QuizMode.SPEED,
      random: fixed,
    });

    const antonym = questions.find((q) => q.kind === QuizQuestionKind.ANTONYM)!;
    expect(antonym.options).toHaveLength(2);
    expect(antonym.options).toContain('misfortune');
    expect(antonym.options).toContain('fluke');
    expect(antonym.options[antonym.correctIndex]).toBe('misfortune');
  });

  it('emits part-of-speech codes the client can localize', () => {
    const questions = buildQuizQuestions({
      word: word(),
      pool,
      scenarios: [],
      mode: QuizMode.SPEED,
      random: fixed,
    });

    const wordType = questions.find(
      (q) => q.kind === QuizQuestionKind.WORD_TYPE,
    )!;
    expect(wordType.options[wordType.correctIndex]).toBe(PartOfSpeech.NOUN);
    for (const option of wordType.options) {
      expect(Object.values(PartOfSpeech)).toContain(option);
    }
  });

  it('skips the antonym axis rather than fake an opposite', () => {
    const questions = buildQuizQuestions({
      word: word({ antonyms: [] }),
      pool,
      scenarios: [],
      mode: QuizMode.SPEED,
      random: fixed,
    });

    expect(questions.some((q) => q.kind === QuizQuestionKind.ANTONYM)).toBe(
      false,
    );
  });

  it('serves realworld straight from what ingestion wrote', () => {
    const questions = buildQuizQuestions({
      word: word(),
      pool: [],
      scenarios: [scenario, { ...scenario, question: 'Second?' }],
      mode: QuizMode.REALWORLD,
      random: fixed,
    });

    expect(questions).toHaveLength(2);
    expect(questions[0].kind).toBe(QuizQuestionKind.USAGE);
    expect(questions[0].situation).toBe(scenario.situation);
    expect(questions[0].options[questions[0].correctIndex]).toBe(
      'What serendipity!',
    );
  });

  it('never uses the target word’s own material as a distractor', () => {
    // 'fluke' belongs to the target; a pool that happens to share it
    // must not offer it as a wrong answer to its own question.
    const dirtyPool = [
      ...pool,
      {
        term: 'happenstance',
        partOfSpeech: PartOfSpeech.NOUN,
        definitions: ['Chance.'],
        synonyms: ['fluke'],
      },
    ];
    const questions = buildQuizQuestions({
      word: word(),
      pool: dirtyPool,
      scenarios: [],
      mode: QuizMode.MASTERY,
      random: Math.random,
    });

    const synonymQ = questions.find(
      (q) => q.kind === QuizQuestionKind.SYNONYM,
    )!;
    expect(
      synonymQ.options.filter((o) => o.toLowerCase() === 'fluke'),
    ).toHaveLength(1);
  });
});
