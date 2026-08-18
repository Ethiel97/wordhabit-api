import { Command } from '@nestjs/cqrs';
import type { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

export interface BackfillDefinitionsItemResult {
  term: string;
  status: 'ENRICHED' | 'SKIPPED' | 'FAILED';
  reason?: string;
}

export interface BackfillDefinitionsResult {
  /** Words still missing this language, before the run. */
  remaining: number;
  requestedCount: number;
  enrichedCount: number;
  skippedCount: number;
  failedCount: number;
  items: BackfillDefinitionsItemResult[];
}

/**
 * Adds a definition in one language to words that already have one in
 * another.
 *
 * Ingestion cannot do this: it skips a term the corpus holds, so a word
 * first written for a French reader never gains an English one. The
 * client falls back to whatever definition exists, so those words reach
 * an anglophone in French.
 *
 * Idempotent by construction: it only ever selects words missing the
 * language, so a run that dies halfway leaves nothing to undo.
 */
export class BackfillDefinitionsCommand extends Command<BackfillDefinitionsResult> {
  constructor(
    public readonly targetLanguage: LanguageCode,
    public readonly explanationLanguage: LanguageCode,
    public readonly count: number,
  ) {
    super();
  }
}
