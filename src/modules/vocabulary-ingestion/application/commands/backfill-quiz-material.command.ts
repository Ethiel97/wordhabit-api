import { Command } from '@nestjs/cqrs';

export interface BackfillQuizMaterialItemResult {
  term: string;
  status: 'ENRICHED' | 'SKIPPED' | 'FAILED';
  reason?: string;
}

export interface BackfillQuizMaterialResult {
  /** Words the corpus still had without scenarios, before this run. */
  remaining: number;
  requestedCount: number;
  enrichedCount: number;
  skippedCount: number;
  failedCount: number;
  items: BackfillQuizMaterialItemResult[];
}

/**
 * Writes quiz material for words ingested before the quiz existed.
 *
 * Idempotent by construction: it only ever selects words with no
 * scenarios, so a run that dies halfway leaves nothing to undo — the
 * next run picks up the leftovers.
 */
export class BackfillQuizMaterialCommand extends Command<BackfillQuizMaterialResult> {
  constructor(public readonly count: number) {
    super();
  }
}
