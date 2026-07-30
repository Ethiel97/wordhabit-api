import { rejectLowQualityItems } from './generated-item-quality';
import type { GeneratedVocabularyWord } from './providers/vocabulary-generation.provider';
import { LanguageCode } from '../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../vocabulary/domain/entities/word-difficulty';
import { PartOfSpeech } from '../../vocabulary/domain/entities/part-of-speech';

const item = (
  overrides: Partial<GeneratedVocabularyWord> = {},
): GeneratedVocabularyWord => ({
  term: 'a cold fish',
  targetLanguage: LanguageCode.EN,
  difficulty: WordDifficulty.INTERMEDIATE,
  partOfSpeech: PartOfSpeech.EXPRESSION,
  definitions: [
    {
      explanationLanguage: LanguageCode.EN,
      text: 'A person who seems unemotional, unfriendly, or detached.',
    },
  ],
  examples: [
    { sentence: "He's a cold fish; I never know what he's thinking." },
  ],
  pronunciations: [],
  synonyms: [{ value: 'aloof' }],
  themeSlugs: ['general'],
  ...overrides,
});

const terms = (items: GeneratedVocabularyWord[]) => items.map((i) => i.term);

describe('rejectLowQualityItems', () => {
  it('keeps a well-formed entry', () => {
    const { accepted, rejected } = rejectLowQualityItems([item()]);

    expect(terms(accepted)).toEqual(['a cold fish']);
    expect(rejected).toHaveLength(0);
  });

  it('drops the second copy of a term in the same batch', () => {
    const { accepted, rejected } = rejectLowQualityItems([
      item(),
      item({ term: 'A Cold Fish' }),
    ]);

    expect(accepted).toHaveLength(1);
    expect(rejected[0].reason).toContain('Duplicate');
  });

  it('reports a missing term and a missing definition separately', () => {
    const { accepted, rejected } = rejectLowQualityItems([
      item({ term: '  ' }),
      item({ term: 'unmoored', definitions: [] }),
    ]);

    expect(accepted).toHaveLength(0);
    expect(rejected.map((r) => r.reason)).toEqual([
      'Missing term.',
      'Missing definitions.',
    ]);
  });

  it('lets an entry through whatever shape its example takes', () => {
    // The regression that motivated cutting the heuristics: the
    // stem-matching version rejected all three, and all three are
    // correct English.
    const { accepted } = rejectLowQualityItems([
      item({
        term: 'to wear one’s heart on one’s sleeve',
        examples: [{ sentence: 'She wears her heart on her sleeve.' }],
      }),
      item({
        term: 'to rub someone the wrong way',
        examples: [{ sentence: 'His tone rubs me the wrong way.' }],
      }),
      item({
        term: 'gregarious',
        partOfSpeech: PartOfSpeech.ADJECTIVE,
        definitions: [
          {
            explanationLanguage: LanguageCode.EN,
            text: 'A gregarious person enjoys being with other people.',
          },
        ],
        examples: [
          { sentence: 'She is far too gregarious to enjoy a quiet weekend.' },
        ],
      }),
    ]);

    expect(accepted).toHaveLength(3);
  });
});
