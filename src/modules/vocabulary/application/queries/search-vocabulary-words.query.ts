import { Query } from '@nestjs/cqrs';
import { GetVocabularyWordByIdResult } from './get-vocabulary-word-by-id.query';
import { LanguageCode } from '../../domain/entities/language-code';
import { WordDifficulty } from '../../domain/entities/word-difficulty';

export type SearchVocabularyWordsResult = {
  items: GetVocabularyWordByIdResult[];
};

export class SearchVocabularyWordsQuery extends Query<SearchVocabularyWordsResult> {
  constructor(
    public readonly term?: string,
    public readonly targetLanguage?: LanguageCode,
    public readonly theme?: string,
    public readonly difficulty?: WordDifficulty,
  ) {
    super();
  }
}
