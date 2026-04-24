import { Command } from '@nestjs/cqrs';
import type { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export interface GenerateVocabularyBatchItemResult {
  term: string;
  status: 'CREATED' | 'SKIPPED_DUPLICATE' | 'FAILED_VALIDATION' | 'FAILED';
  wordId?: string;
  reason?: string;
}

export interface GenerateVocabularyBatchResult {
  requestedCount: number;
  generatedCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  items: GenerateVocabularyBatchItemResult[];
}

export class GenerateVocabularyBatchCommand extends Command<GenerateVocabularyBatchResult> {
  constructor(
    public readonly targetLanguage: LanguageCode,
    public readonly explanationLanguage: LanguageCode | undefined,
    public readonly count: number,
    public readonly theme?: string,
  ) {
    super();
  }
}
