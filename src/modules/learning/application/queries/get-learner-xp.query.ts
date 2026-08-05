import { Query } from '@nestjs/cqrs';

export class GetLearnerXpQuery extends Query<GetLearnerXpResult> {
  constructor(
    public readonly userId: string,
    /**
     * The caller's own today, `yyyy-MM-dd`, which the pace window ends
     * on. Supplied rather than derived: only the client knows the user's
     * calendar day.
     */
    public readonly to: string,
  ) {
    super();
  }
}

export type GetLearnerXpResult = {
  /** Lifetime XP. */
  xp: number;
  /** Recent pace, averaged over the last seven local days. */
  dailyXp: number;
};
