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
};

/** What "fluent" means for a single word, as a mastery percentage. */
export const FLUENT_MASTERY_LEVEL = 90;

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
 *
 * BILINGUAL_PRO and QUIZ_CHAMPION are deliberately absent: one needs a
 * second active learning profile and the other needs the quiz. They stay
 * locked, which reads as a distant goal rather than a defect, and adding
 * them later is a row each.
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
