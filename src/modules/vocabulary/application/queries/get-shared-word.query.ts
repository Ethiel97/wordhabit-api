import { Query } from '@nestjs/cqrs';
import { WordDefinition } from '../../domain/entities/word-definition';

export type GetSharedWordQueryResult = {
  id: string;
  term: string;
  pronunciation: string | null;
  partOfSpeech: string;
  targetLanguage: string;
  definitions: WordDefinition[];
  example: {
    sentence: string | null;
  };
};

export class GetSharedWordQuery extends Query<GetSharedWordQueryResult> {
  constructor(public readonly wordId: string) {
    super();
  }
}
