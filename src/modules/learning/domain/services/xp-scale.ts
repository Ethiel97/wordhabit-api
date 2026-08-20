/**
 * What each action is worth. Mirrors `XpAward` in the app, which quotes
 * these numbers in its "How you earn XP" table: they have to agree, or
 * the app promises a rate the ladder does not pay.
 *
 * Weighted towards the day rather than the item. Per-item pay rewards a
 * backlog: forty cards let sit earn a windfall, while the learner who
 * does their one word a day earns almost nothing. The journey is the
 * only rate that is capped and identical for everyone.
 */
export const XP_PER_FLASHCARD_RECALL = 2;
export const XP_PER_QUIZ_ANSWER = 2;
export const XP_PER_DAILY_JOURNEY = 25;
export const XP_PER_BADGE = 50;

/** Days the recent-pace average is taken over. */
export const XP_PACE_WINDOW_DAYS = 7;

/**
 * XP is derived from the review log rather than stored in a counter.
 *
 * The log is already the durable record of what happened, so a total
 * read from it can never disagree with the history the activity screen
 * draws, and it needs no backfill for accounts that predate levels. A
 * materialised counter is the fallback if this ever gets expensive.
 *
 * Every source has a durable record: the review log, the quiz log, the
 * badge table, and the day a quiz or a mastery closed the journey.
 */
export function xpForRecalls(recalls: number): number {
  return recalls * XP_PER_FLASHCARD_RECALL;
}

export function xpForQuizAnswers(correctAnswers: number): number {
  return correctAnswers * XP_PER_QUIZ_ANSWER;
}

export function xpForJourneys(days: number): number {
  return days * XP_PER_DAILY_JOURNEY;
}

export function xpForBadges(badges: number): number {
  return badges * XP_PER_BADGE;
}

/**
 * Daily pace, averaged over the window rather than taken from today: a
 * Monday morning before the first review would otherwise report zero,
 * and with it a next level that is never reached.
 */
export function dailyPace(xpInWindow: number): number {
  return Math.round(xpInWindow / XP_PACE_WINDOW_DAYS);
}
