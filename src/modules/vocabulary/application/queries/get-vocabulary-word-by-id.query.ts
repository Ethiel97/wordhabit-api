import { WordDifficulty } from '../../domain/entities/word-difficulty';
import { PartOfSpeech } from '../../domain/entities/part-of-speech';
import { VocabularyWordStatus } from '../../domain/entities/vocabulary-word-status';
import { WordDefinition } from '../../domain/entities/word-definition';
import { WordExample } from '../../domain/entities/word-example';
import { WordPronunciation } from '../../domain/entities/word-pronounciation';
import { WordSynonym } from '../../domain/entities/word-synonym';
import { Query } from '@nestjs/cqrs';

export interface GetVocabularyWordByIdResult {
  id: string;
  term: string;
  normalizedTerm: string;
  targetLanguage: string;
  difficulty: WordDifficulty;
  partOfSpeech: PartOfSpeech;
  status: VocabularyWordStatus;
  createdAt: Date;
  updatedAt: Date;
  definitions: WordDefinition[];
  examples: WordExample[];
  pronunciations: WordPronunciation[];
  synonyms: WordSynonym[];
}

export class GetVocabularyWordByIdQuery extends Query<GetVocabularyWordByIdResult> {
  constructor(public readonly wordId: string) {
    super();
  }
}
