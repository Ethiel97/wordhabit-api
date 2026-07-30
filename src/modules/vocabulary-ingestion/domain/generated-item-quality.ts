import type { GeneratedVocabularyWord } from './providers/vocabulary-generation.provider';

/**
 * The gate between the model and the corpus.
 *
 * Deliberately thin. It once also tried to detect circular definitions
 * and examples that never use their word — heuristics over stems,
 * function words and overlap ratios that rejected ten perfectly good
 * entries out of ten on their first contact with real output. A false
 * rejection is silent corpus loss, which is worse than the defect it was
 * guarding against, so only what is mechanically certain remains.
 *
 * If a real batch shows those defects again, the log reports every
 * rejection — add the check back then, against the string that failed.
 */
export interface RejectedGeneratedItem {
  term: string;
  reason: string;
}

export function rejectLowQualityItems(items: GeneratedVocabularyWord[]): {
  accepted: GeneratedVocabularyWord[];
  rejected: RejectedGeneratedItem[];
} {
  const accepted: GeneratedVocabularyWord[] = [];
  const rejected: RejectedGeneratedItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const term = item.term?.trim() ?? '';

    if (!term) {
      rejected.push({ term: '', reason: 'Missing term.' });
      continue;
    }

    // The store rejects duplicates too, but by throwing a conflict per
    // item — noise that buries the duplicates that matter, the ones
    // against rows already in the corpus.
    const normalized = term.toLowerCase();
    if (seen.has(normalized)) {
      rejected.push({ term, reason: 'Duplicate term within the batch.' });
      continue;
    }
    seen.add(normalized);

    if (!item.definitions?.length) {
      rejected.push({ term, reason: 'Missing definitions.' });
      continue;
    }

    // Structural, not stylistic: the word detail screen has a slot for
    // the example, and an entry without one renders half empty. The
    // schema cannot enforce it — `strict` mode accepts an empty array.
    if (!item.examples?.length) {
      rejected.push({ term, reason: 'Missing examples.' });
      continue;
    }

    accepted.push({ ...item, term });
  }

  return { accepted, rejected };
}
