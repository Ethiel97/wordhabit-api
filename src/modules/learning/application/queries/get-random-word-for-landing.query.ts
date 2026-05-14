import { Query } from '@nestjs/cqrs';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { WordDefinition } from '../../../vocabulary/domain/entities/word-definition';
import { WordExample } from '../../../vocabulary/domain/entities/word-example';
import { WordPronunciation } from '../../../vocabulary/domain/entities/word-pronounciation';
import { WordSynonym } from '../../../vocabulary/domain/entities/word-synonym';

export class GetRandomWordForLandingQuery extends Query<GetRandomWordForLandingResult> {
  constructor(public readonly targetLanguage?: LanguageCode) {
    super();
  }
}

export interface GetRandomWordForLandingResult {
  word: VocabularyWord;
  definitions: WordDefinition[];
  examples: WordExample[];
  pronunciations: WordPronunciation[];
  synonyms: WordSynonym[];
  themes?: string[];
}
