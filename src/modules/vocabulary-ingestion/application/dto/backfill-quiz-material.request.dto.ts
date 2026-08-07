import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BackfillQuizMaterialRequestDto {
  /**
   * Words to enrich in this run. Capped so one HTTP call cannot queue an
   * hour of reasoning-model time — the corpus backfills over repeated
   * calls, which is also what makes a failed run cheap.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count: number = 50;
}
