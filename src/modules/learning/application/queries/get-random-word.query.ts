import { Query } from '@nestjs/cqrs';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { WordDefinition } from '../../../vocabulary/domain/entities/word-definition';
import { WordExample } from '../../../vocabulary/domain/entities/word-example';
import { WordPronunciation } from '../../../vocabulary/domain/entities/word-pronounciation';
import { WordSynonym } from '../../../vocabulary/domain/entities/word-synonym';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';

export class GetRandomWordQuery extends Query<GetRandomWordResult> {
  constructor(
    public readonly targetLanguage?: LanguageCode,
    public readonly difficulty?: WordDifficulty,
    public readonly themes?: string[],
  ) {
    super();
  }
}

export interface GetRandomWordResult {
  word: VocabularyWord;
  definitions: WordDefinition[];
  examples: WordExample[];
  pronunciations: WordPronunciation[];
  synonyms: WordSynonym[];
  themes?: string[];
}
