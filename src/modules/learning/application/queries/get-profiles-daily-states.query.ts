import { Query } from '@nestjs/cqrs';

export class GetProfilesDailyStatesQuery extends Query<GetProfilesDailyStatesResult> {
  constructor(
    public readonly userId: string,
    /** The caller's own day, `yyyy-MM-dd` — supplied, never derived. */
    public readonly localDate: string,
  ) {
    super();
  }
}

export type GetProfilesDailyStatesResult = {
  profileId: string;
  targetLanguage: string;
  /** Absent when this profile has no word for the day yet. */
  wordId: string | null;
  quizCompleted: boolean;
}[];
