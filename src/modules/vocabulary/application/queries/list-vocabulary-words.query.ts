import { Query } from '@nestjs/cqrs';
import { LanguageCode } from '../../domain/entities/language-code';
import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';
import { VocabularyWordStatus } from '../../domain/entities/vocabulary-word-status';
import { PaginatedResult } from '../../../../shared/application/pagination/paginated-result';

export interface VocabularyWordListItem {
  id: string;
  term: string;
  normalizedTerm: string;
  targetLanguage: LanguageCode;
  difficulty: WordDifficulty;
  partOfSpeech: PartOfSpeech;
  status: VocabularyWordStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ListVocabularyWordsResult = PaginatedResult<VocabularyWordListItem>;

export class ListVocabularyWordsQuery extends Query<ListVocabularyWordsResult> {
  constructor(
    public readonly page = 1,
    public readonly pageSize = 10,
    public readonly targetLanguage?: LanguageCode,
    public readonly difficulty?: WordDifficulty,
    public readonly partOfSpeech?: PartOfSpeech,
    public readonly status?: VocabularyWordStatus,
    public readonly search?: string,
  ) {
    super();
  }
}
