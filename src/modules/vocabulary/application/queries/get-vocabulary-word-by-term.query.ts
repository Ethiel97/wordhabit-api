import { Query } from '@nestjs/cqrs';
import { GetVocabularyWordByIdResult } from './get-vocabulary-word-by-id.query';
import { LanguageCode } from '../../domain/entities/language-code';

export type GetVocabularyWordByTermResult = GetVocabularyWordByIdResult;

export class GetVocabularyWordByTermQuery extends Query<GetVocabularyWordByTermResult> {
  constructor(
    public readonly term: string,
    public readonly targetLanguage: LanguageCode,
  ) {
    super();
  }
}
