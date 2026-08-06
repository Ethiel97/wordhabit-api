/**
 * Every badge the app can award.
 *
 * The application's own enum, not Prisma's. The two carry the same
 * names, which is what lets the mapper stay a switch — but the domain
 * owns this list, so regenerating the client, renaming the column or
 * swapping the ORM cannot reach the rules.
 */
export enum BadgeCode {
  STREAK_30 = 'STREAK_30',
  STREAK_50 = 'STREAK_50',
  STREAK_150 = 'STREAK_150',
  STREAK_200 = 'STREAK_200',
  HABIT_MASTER = 'HABIT_MASTER',
  COLLECTOR_50 = 'COLLECTOR_50',
  COLLECTOR_100 = 'COLLECTOR_100',
  COLLECTOR_150 = 'COLLECTOR_150',
  COLLECTOR_200 = 'COLLECTOR_200',
  WORD_EXPLORER = 'WORD_EXPLORER',
  FLUENT_LEARNER = 'FLUENT_LEARNER',
  BILINGUAL_PRO = 'BILINGUAL_PRO',
  QUIZ_CHAMPION = 'QUIZ_CHAMPION',
}
