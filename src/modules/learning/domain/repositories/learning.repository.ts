import { VocabularyWord } from '../../../vocabulary/domain/entities/vocabulary-word';
import { UserLearningProfile } from '../../../user-learning/domain/entities/user-learning-profile';
import { VocabularyWordAggregate } from '../../../vocabulary/domain/repositories/vocabulary.repository';
import {
  UserWordProgress,
  UserWordProgressMasteryLevel,
  UserWordProgressStatus,
} from '../entities/user-word-progress';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { UserLearningStreak } from '../entities/user-learning-streak';
import { FavoriteWord } from '../entities/favorite-word';
import { WordDefinition } from '../../../vocabulary/domain/entities/word-definition';
import { WordExample } from '../../../vocabulary/domain/entities/word-example';
import { WordPronunciation } from '../../../vocabulary/domain/entities/word-pronounciation';
import {
  WordAntonym,
  WordSynonym,
} from '../../../vocabulary/domain/entities/word-synonym';
import { PartOfSpeech } from '../../../vocabulary/domain/entities/part-of-speech';
import { BadgeCode } from '../entities/badge';
import {
  LanguageMasteredWords,
  LearningBadgeFigures,
} from '../services/badge-catalog';

export const LEARNING_REPOSITORY = Symbol('LEARNING_REPOSITORY');

// One token per contract, all resolving to the same Prisma class for
// now. A handler injects the one it needs, and the day an implementation
// is split off, only its token's binding changes.
export const TODAY_WORD_REPOSITORY = Symbol('TODAY_WORD_REPOSITORY');
export const WORD_PROGRESS_REPOSITORY = Symbol('WORD_PROGRESS_REPOSITORY');
export const LEARNER_BADGE_REPOSITORY = Symbol('LEARNER_BADGE_REPOSITORY');
export const LEARNER_PROGRESS_REPOSITORY = Symbol(
  'LEARNER_PROGRESS_REPOSITORY',
);
export const WORD_LIBRARY_REPOSITORY = Symbol('WORD_LIBRARY_REPOSITORY');

export type UserLearningStats = {
  seen: number;
  learning: number;
  mastered: number;
  skipped: number;
  total: number;
};

export type FindUserLearningStatsParams = {
  userId: string;
  /** @see FindReviewQueueParams.targetLanguage */
  targetLanguage: LanguageCode;
};

export const emptyUserLearningStats = (): UserLearningStats => ({
  seen: 0,
  learning: 0,
  mastered: 0,
  skipped: 0,
  total: 0,
});

export interface CreateDailyAssignmentParams {
  userId: string;
  userLearningProfileId: string;
  wordId: string;
  assignedFor: Date;
}

export interface FindTodayAssignmentParams {
  /**
   * Keyed on the profile, not the user: Pro learns one word per language
   * per day, so a user has as many assignments for a given day as they
   * have profiles.
   */
  userLearningProfileId: string;
  assignedFor: Date;
}

export type TodayWordAssignment = VocabularyWordAggregate & {
  assignmentId: string;
  /**
   * The day the word belongs to, `yyyy-MM-dd`. A string, not a Date: a
   * Date invites rendering in a timezone, which names the previous day
   * west of Greenwich.
   */
  assignedFor: string;
};

export type RandomWord = VocabularyWordAggregate;

export type ReviewQueueItem = {
  progressId: string;
  wordId: string;
  term: string;
  masteryLevel: number;
  reviewCount: number;
  status: UserWordProgressStatus;
  nextReviewOn: string | null;
  // A session preloads its whole deck, so the card never waits on a
  // fetch mid-flip: front (part of speech, language) and back (meaning,
  // example, synonyms) both ship here.
  partOfSpeech: PartOfSpeech;
  targetLanguage: LanguageCode;
  definitions: WordDefinition[];
  examples: WordExample[];
  pronunciations: WordPronunciation[];
  antonyms: WordAntonym[];
  synonyms: WordSynonym[];
};

export interface FindUserWordProgressParams {
  userId: string;
  wordId: string;
}

export interface SetUserWordProgressStatusParams {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: UserWordProgressMasteryLevel;
  seenAt?: Date | null;
  nextReviewOn?: string | null;
}

export interface FindRandomWordParams {
  targetLanguage?: LanguageCode;
  difficulty?: WordDifficulty;
  themes?: string[];
}

export interface FindReviewQueueParams {
  userId: string;
  /**
   * The profile's language, not its id: progress hangs off the word, and
   * a word belongs to one language. Deriving the profile that way means a
   * language deleted and taken up again finds its own history waiting.
   */
  targetLanguage: LanguageCode;
  /** The learner's own day, `yyyy-MM-dd`: due dates are days, not times. */
  localDate: string;
  limit: number;
}

export interface UpdateUserWordReviewParams {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date;
  nextReviewOn: string | null;
}

/**
 * Only the fields a reschedule may move. Review count, last review and
 * the activity log are absent by design: the type is what keeps a
 * correction from becoming a review.
 */
export interface RescheduleUserWordReviewParams {
  userId: string;
  wordId: string;
  status: UserWordProgressStatus;
  masteryLevel: number;
  nextReviewOn: string | null;
}

export interface UpsertUserLearningStreakParams {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  /** `yyyy-MM-dd`. */
  lastActivityLocalDate: string;
  /**
   * The pending break, when this write changes it.
   *
   * Optional on purpose: `undefined` leaves the stored break alone, which
   * is what an ordinary review must do — a learner still inside the
   * repair window would otherwise lose the chain by practising. `null`
   * clears it, which is what a repair does.
   */
  brokenStreak?: number | null;
  brokenOnLocalDate?: string | null;
}

export interface RecordStreakRepairsParams {
  userId: string;
  /** The days that were filled in, `yyyy-MM-dd`. */
  repairedLocalDates: string[];
}

export interface CountStreakRepairsInMonthParams {
  userId: string;
  /** Calendar month to count in, `yyyy-MM`. */
  monthPrefix: string;
}

export interface FindStreakRepairsParams {
  userId: string;
  /** Inclusive `yyyy-MM-dd` bounds, compared as text. */
  from: string;
  to: string;
}

export interface RecordWordReviewEventParams {
  userId: string;
  wordId: string;
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  /** The client's own calendar day, `yyyy-MM-dd`. */
  localDate: string;
}

/** The last review of one word, whenever it happened. */
export type LastWordReview = {
  correct: boolean;
  masteryBefore: number;
  masteryAfter: number;
  localDate: string;
};

export interface FindUserDailyActivityParams {
  userId: string;
  /** Inclusive `yyyy-MM-dd`, compared as text. */
  from: string;
  /** Inclusive `yyyy-MM-dd`. */
  to: string;
}

/** Review counts for one local calendar day. */
export type UserDailyActivity = {
  /** Local calendar day, `yyyy-MM-dd`, exactly as it was recorded. */
  date: string;
  reviewCount: number;
  correctCount: number;
};

export interface FindUserActivityDetailParams {
  userId: string;
  /** Inclusive `yyyy-MM-dd` bounds of the range the caller tapped. */
  from: string;
  to: string;
  /** Caps the word list; the busiest words come first. */
  limit: number;
}

/** A word the user reviewed inside the requested range. */
export type ActivityDetailWord = {
  wordId: string;
  term: string;
  /** Current mastery, not mastery at review time. */
  masteryLevel: number;
  /** Times reviewed within the range, not lifetime. */
  reviewCount: number;
};

/**
 * What happened across a range, behind tapping a heatmap day or a chart
 * bar. Kept apart from [UserDailyActivity], which spans a year and has
 * to stay small.
 */
export type UserActivityDetail = {
  reviewCount: number;
  correctCount: number;
  /**
   * Distinct words reviewed in the range, counted before [words] is
   * trimmed. Stands in for a "new words" figure, which would need
   * `seenAt` and therefore timezone arithmetic.
   */
  distinctWordCount: number;
  /** Distinct words reviewed, busiest first, capped by the request. */
  words: ActivityDetailWord[];
  /** True when [words] omits some of what was reviewed. */
  hasMoreWords: boolean;
};

export type FindUserWordLibraryParams = {
  userId: string;
  /** @see FindReviewQueueParams.targetLanguage */
  targetLanguage: LanguageCode;
  status?: UserWordProgressStatus;
  search?: string;
  /**
   * Narrows to the words the learner saved. Applied here rather than on
   * the loaded pages: a favourite sitting in a page the list has not
   * scrolled to yet would otherwise be counted and never shown.
   */
  savedOnly?: boolean;
  limit: number;
  cursor?: string;
};

export type UserWordLibraryDefinition = {
  id: string;
  text: string;
  explanationLanguage: LanguageCode;
};

export type UserWordLibraryItem = {
  progressId: string;
  wordId: string;
  term: string;
  normalizedTerm: string;
  targetLanguage: LanguageCode;
  status: UserWordProgressStatus;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  nextReviewOn: string | null;
  updatedAt: Date;
  pronunciations: WordPronunciation[];
  // Trimmed definitions: enough for the list preview and to pick the
  // right language. The full word loads on the detail screen.
  definitions: UserWordLibraryDefinition[];
  // The row shows the IPA next to the term.
};

// Whole-library aggregates, never affected by the active filter.
export type UserWordLibrarySummary = {
  total: number;
  averageMastery: number;
  statusCounts: Record<UserWordProgressStatus, number>;
};

export type UserWordLibraryResult = {
  items: UserWordLibraryItem[];
  nextCursor: string | null;
  summary: UserWordLibrarySummary;
};

/**
 * Whole, so a learner without a profile still gets a parsable page.
 *
 * Built per call rather than shared: `items` is a mutable array, and one
 * caller appending to it would poison every later empty page.
 */
export const emptyUserWordLibrary = (): UserWordLibraryResult => ({
  items: [],
  nextCursor: null,
  summary: {
    total: 0,
    averageMastery: 0,
    statusCounts: {
      [UserWordProgressStatus.NEW]: 0,
      [UserWordProgressStatus.SEEN]: 0,
      [UserWordProgressStatus.LEARNING]: 0,
      [UserWordProgressStatus.MASTERED]: 0,
      [UserWordProgressStatus.SKIPPED]: 0,
    },
  },
});

/** A badge a user holds, and the day they won it. */
export type EarnedBadge = {
  code: BadgeCode;
  earnedAt: Date;
};

/** Today's word for one profile, as the profile switcher lists them. */
export type ProfileDayState = {
  userLearningProfileId: string;
  wordId: string;
  quizCompleted: boolean;
};

/// How many words a profile has been given, all time. Counted from the
/// assignments because they are the only table keyed on the profile;
/// UserWordProgress belongs to the person.
export type ProfileWordCount = {
  userLearningProfileId: string;
  wordCount: number;
};

/**
 * The contracts below are declared separately so a handler can depend on
 * the slice it uses instead of on all twenty-five methods. They live in
 * one file for now because they share this file's parameter types;
 * splitting the file means extracting those first.
 *
 * `LearningRepository` remains their union, so nothing that already
 * injects it has to move at once.
 */

/** Assigning and finding the word a profile owes today. */
export interface TodayWordRepository {
  /**
   * Today's state for several profiles at once. The switcher shows a
   * status per language, and one query per profile would grow with the
   * plan.
   */
  findProfileDayStates(params: {
    userLearningProfileIds: string[];
    assignedFor: Date;
  }): Promise<ProfileDayState[]>;

  countWordsByProfile(params: {
    userLearningProfileIds: string[];
  }): Promise<ProfileWordCount[]>;

  findTodayAssignment(
    params: FindTodayAssignmentParams,
  ): Promise<TodayWordAssignment | null>;

  createDailyAssignment(
    params: CreateDailyAssignmentParams,
  ): Promise<TodayWordAssignment>;

  /**
   * A word the user has not been given recently, honouring their topics
   * and language, and their level when the pool allows.
   */
  findCandidateWord(
    profile: UserLearningProfile,
  ): Promise<VocabularyWord | null>;

  findRandomWord(params: FindRandomWordParams): Promise<RandomWord | null>;
}

/** What the learner has done with a word, and when it comes back. */
export interface WordProgressRepository {
  findUserWordProgress(
    params: FindUserWordProgressParams,
  ): Promise<UserWordProgress | null>;

  setUserWordProgressStatus(
    params: SetUserWordProgressStatusParams,
  ): Promise<UserWordProgress>;

  findReviewQueue(params: FindReviewQueueParams): Promise<ReviewQueueItem[]>;

  updateUserWordReview(
    params: UpdateUserWordReviewParams,
  ): Promise<UserWordProgress>;

  rescheduleUserWordReview(
    params: RescheduleUserWordReviewParams,
  ): Promise<UserWordProgress>;

  /**
   * Appends one review to the activity log. Never updates: unlike
   * `lastReviewedAt`, the log is what makes per-day history recoverable.
   */
  recordWordReviewEvent(params: RecordWordReviewEventParams): Promise<void>;

  findLastWordReview(params: {
    userId: string;
    wordId: string;
  }): Promise<LastWordReview | null>;

  /**
   * Correct reviews, optionally inside an inclusive local-day range.
   * The only fact XP is derived from today.
   */
  countCorrectReviews(params: {
    userId: string;
    from?: string;
    to?: string;
  }): Promise<number>;
}

/** Measuring and awarding badges. */
export interface LearnerBadgeRepository {
  /** Every figure the badge rules are measured against, in one read. */
  findBadgeSnapshot(userId: string): Promise<LearningBadgeFigures>;

  /**
   * Words near mastery, split by the language they belong to. Only
   * languages holding at least one appear.
   *
   * The raw figures, not a verdict: `countMasteredLanguages` owns what
   * makes a language count, so the threshold stays out of SQL.
   */
  countMasteredWordsByLanguage(params: {
    userId: string;
  }): Promise<LanguageMasteredWords[]>;

  /**
   * Records the codes the user does not already hold, and returns those
   * it actually added.
   *
   * The caller passes everything currently earned rather than a diff:
   * the unique index decides what is new, so a race between two writes
   * cannot award the same badge twice.
   */
  awardBadges(params: {
    userId: string;
    codes: BadgeCode[];
  }): Promise<BadgeCode[]>;

  findUserBadges(userId: string): Promise<EarnedBadge[]>;
}

/** Activity, streak and the figures the progress tab reads. */
export interface LearnerProgressRepository {
  /**
   * Review counts per local day, sparse: the client generates its own
   * day list and fills the gaps.
   */
  findUserDailyActivity(
    params: FindUserDailyActivityParams,
  ): Promise<UserDailyActivity[]>;

  /** Counts plus the words reviewed across the range. */
  findUserActivityDetail(
    params: FindUserActivityDetailParams,
  ): Promise<UserActivityDetail>;

  findUserLearningStreak(userId: string): Promise<UserLearningStreak | null>;

  upsertUserLearningStreak(
    params: UpsertUserLearningStreakParams,
  ): Promise<UserLearningStreak>;

  /**
   * Writes one row per day bought, all or nothing.
   *
   * A unique index on (userId, repairedLocalDate) makes a day
   * impossible to buy twice, so a retried request cannot inflate a
   * streak.
   */
  recordStreakRepairs(params: RecordStreakRepairsParams): Promise<void>;

  /** How many repairs the learner has spent in a calendar month. */
  countStreakRepairsInMonth(
    params: CountStreakRepairsInMonthParams,
  ): Promise<number>;

  /**
   * The days inside a range that were bought rather than practised, so
   * the progress map can mark them. Sorted, and sparse like
   * [findUserDailyActivity].
   */
  findStreakRepairs(params: FindStreakRepairsParams): Promise<string[]>;

  /**
   * Words collected, and how far each one has come, for one language.
   *
   * The streak above it stays whole-person: a day practised is a day
   * practised, whichever language it was. Mastery does not travel that
   * way, so it is counted per language.
   */
  findUserLearningStats(
    params: FindUserLearningStatsParams,
  ): Promise<UserLearningStats>;
}

/** The words a learner has collected. */
export interface WordLibraryRepository {
  findUserWordLibrary(
    params: FindUserWordLibraryParams,
  ): Promise<UserWordLibraryResult>;

  /**
   * The learner's saved words in [targetLanguage]. Scoped like the
   * library itself: a French profile showing English favourites gives a
   * count that its own list can never match.
   */
  findUserFavoriteWords(params: {
    userId: string;
    targetLanguage: LanguageCode;
  }): Promise<FavoriteWord[]>;

  addUserFavoriteWord(userId: string, wordId: string): Promise<FavoriteWord>;

  removeUserFavoriteWord(userId: string, wordId: string): Promise<boolean>;
}

export interface LearningRepository
  extends
    TodayWordRepository,
    WordProgressRepository,
    LearnerBadgeRepository,
    LearnerProgressRepository,
    WordLibraryRepository {}
