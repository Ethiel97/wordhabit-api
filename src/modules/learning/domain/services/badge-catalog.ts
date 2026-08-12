import { BadgeCode } from '../entities/badge';

/**
 * Everything a badge is measured against.
 *
 * Assembled once per evaluation so the rules stay pure: no rule reaches
 * for a repository, and the whole catalogue is testable from a literal.
 */
export type BadgeSnapshot = {
  /**
   * The *best* streak, never the current one. A badge outlives the run
   * that earned it, so evaluating on `currentStreak` would take back a
   * 150-day badge the day someone missed a morning.
   */
  longestStreak: number;

  /** Words in the library, whatever their status. */
  wordsCollected: number;

  /** Distinct themes those words are drawn from. */
  themesExplored: number;

  /** Words held at [FLUENT_MASTERY_LEVEL] or above. */
  wordsNearMastery: number;

  /** Quiz modes conquered — see [PERFECT_DAYS_PER_QUIZ_MODE]. */
  quizPerfectModes: number;

  /**
   * Languages carried to mastery — see
   * [MASTERED_WORDS_PER_BILINGUAL_LANGUAGE].
   */
  masteredLanguages: number;
};

/**
 * The snapshot's plain learning figures — the ones a single count
 * answers. The two that are a verdict over a distribution are composed
 * by `BadgeAwarderService` from the rows their repositories return.
 */
export type LearningBadgeFigures = Omit<
  BadgeSnapshot,
  'quizPerfectModes' | 'masteredLanguages'
>;

/** What "fluent" means for a single word, as a mastery percentage. */
export const FLUENT_MASTERY_LEVEL = 90;

/**
 * Days carrying a perfect round before a quiz mode counts as conquered.
 *
 * Days rather than rounds, because rounds can be farmed in one sitting
 * and days cannot. The product rewards coming back, so the badge that
 * says "champion" should measure the same thing the streak does.
 *
 * The client states this number in `badgeDescQuizChampion`; moving the
 * dial means moving that sentence in all three ARB files.
 */
export const PERFECT_DAYS_PER_QUIZ_MODE = 5;

/** How many days a learner has played one quiz mode perfectly. */
export type QuizModePerfectDays = {
  mode: string;
  perfectDays: number;
};

/**
 * Modes that clear [PERFECT_DAYS_PER_QUIZ_MODE].
 *
 * Here rather than in the query so the threshold is testable without a
 * database, and so the badge's rules stay in one file.
 */
export function countConqueredQuizModes(
  modes: readonly QuizModePerfectDays[],
): number {
  return modes.filter((mode) => mode.perfectDays >= PERFECT_DAYS_PER_QUIZ_MODE)
    .length;
}

/**
 * Words at [FLUENT_MASTERY_LEVEL] a language needs before it counts
 * towards BILINGUAL_PRO.
 *
 * Held words would make the badge a button press: adding a profile is
 * one tap, and "bilingual" has to mean something was learned. Twice this
 * figure is FLUENT_LEARNER's own bar, which is the point — the same
 * effort, split across two languages instead of poured into one.
 *
 * The client states the number in `badgeDescBilingualPro`.
 */
export const MASTERED_WORDS_PER_BILINGUAL_LANGUAGE = 25;

/** How many words a learner has brought near mastery in one language. */
export type LanguageMasteredWords = {
  language: string;
  masteredWords: number;
};

/** Languages that clear [MASTERED_WORDS_PER_BILINGUAL_LANGUAGE]. */
export function countMasteredLanguages(
  languages: readonly LanguageMasteredWords[],
): number {
  return languages.filter(
    (language) =>
      language.masteredWords >= MASTERED_WORDS_PER_BILINGUAL_LANGUAGE,
  ).length;
}

type BadgeRule = {
  code: BadgeCode;
  /** The figure the badge is won at. */
  target: number;
  /** Where the learner stands against it. */
  progress: (snapshot: BadgeSnapshot) => number;
};

/**
 * The rules, in one table.
 *
 * Every badge is the same shape — a count against a target — which is
 * what lets the evaluator and the "closest to unlocking" hint both read
 * from here instead of restating the thresholds.
 */
export const BADGE_RULES: readonly BadgeRule[] = [
  { code: BadgeCode.STREAK_30, target: 30, progress: (s) => s.longestStreak },
  { code: BadgeCode.STREAK_50, target: 50, progress: (s) => s.longestStreak },
  { code: BadgeCode.STREAK_150, target: 150, progress: (s) => s.longestStreak },
  { code: BadgeCode.STREAK_200, target: 200, progress: (s) => s.longestStreak },
  {
    code: BadgeCode.HABIT_MASTER,
    target: 365,
    progress: (s) => s.longestStreak,
  },
  {
    code: BadgeCode.COLLECTOR_50,
    target: 50,
    progress: (s) => s.wordsCollected,
  },
  {
    code: BadgeCode.COLLECTOR_100,
    target: 100,
    progress: (s) => s.wordsCollected,
  },
  {
    code: BadgeCode.COLLECTOR_150,
    target: 150,
    progress: (s) => s.wordsCollected,
  },
  {
    code: BadgeCode.COLLECTOR_200,
    target: 200,
    progress: (s) => s.wordsCollected,
  },
  {
    code: BadgeCode.WORD_EXPLORER,
    target: 5,
    progress: (s) => s.themesExplored,
  },
  {
    code: BadgeCode.FLUENT_LEARNER,
    target: 50,
    progress: (s) => s.wordsNearMastery,
  },
  {
    // Two languages carried to mastery, not two profiles created.
    code: BadgeCode.BILINGUAL_PRO,
    target: 2,
    progress: (s) => s.masteredLanguages,
  },
  {
    // The three modes, each carried on several days — mastery is free,
    // the other two are Pro, so the badge is structurally a Pro badge.
    // Its bar is set accordingly: the only people who can reach it are
    // already subscribers, and a trophy they clear in one session is
    // not a trophy.
    code: BadgeCode.QUIZ_CHAMPION,
    target: 3,
    progress: (s) => s.quizPerfectModes,
  },
];

/** Codes the snapshot has met, whether or not they are already held. */
export function earnedBadgeCodes(snapshot: BadgeSnapshot): BadgeCode[] {
  return BADGE_RULES.filter(
    (rule) => rule.progress(snapshot) >= rule.target,
  ).map((rule) => rule.code);
}

/**
 * How far along an unearned badge is, capped at its target.
 *
 * The same numbers the badge is won on, so a screen cannot show progress
 * against one figure while the award is decided by another.
 */
export function badgeProgress(
  code: BadgeCode,
  snapshot: BadgeSnapshot,
): { have: number; need: number } | null {
  const rule = BADGE_RULES.find((candidate) => candidate.code === code);
  if (!rule) return null;

  return {
    have: Math.min(rule.progress(snapshot), rule.target),
    need: rule.target,
  };
}

/** A badge and where the learner stands on it. */
export type BadgeStanding = {
  code: BadgeCode;

  /** The day it was won, null while it is still locked. */
  earnedAt: Date | null;

  /**
   * How far along, null for a badge that is earned or has no rule yet.
   *
   * Two of the thirteen wait on the quiz and on a second learning
   * profile. They have no figure to measure, which reads as a locked
   * tile with no bar — a distant goal rather than one stuck at 0%.
   */
  progress: { have: number; need: number } | null;
};

/**
 * Every badge the app can draw, earned or not, in the order the screen
 * reads: what you hold, newest first, then what is closest to falling.
 *
 * Driven by the catalogue rather than by the rows, so a fresh account
 * sees thirteen goals instead of an empty screen.
 */
export function badgeStandings(params: {
  earned: { code: BadgeCode; earnedAt: Date }[];
  snapshot: BadgeSnapshot;
}): BadgeStanding[] {
  const earnedAt = new Map(
    params.earned.map((badge) => [badge.code, badge.earnedAt]),
  );

  const standings = Object.values(BadgeCode).map((code) => {
    const won = earnedAt.get(code) ?? null;

    return {
      code,
      earnedAt: won,
      // Nothing left to measure once it is won: a full bar beside an
      // earned tile is noise.
      progress: won ? null : badgeProgress(code, params.snapshot),
    };
  });

  return standings.sort(compareStandings);
}

function compareStandings(a: BadgeStanding, b: BadgeStanding): number {
  if (a.earnedAt && b.earnedAt) {
    return b.earnedAt.getTime() - a.earnedAt.getTime();
  }
  if (a.earnedAt) return -1;
  if (b.earnedAt) return 1;

  return share(b) - share(a);
}

/** Below zero for a badge with no rule, so those sink to the bottom. */
function share(standing: BadgeStanding): number {
  if (!standing.progress) return -1;
  return standing.progress.have / standing.progress.need;
}
