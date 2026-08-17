import { AppError } from '../../../../shared/application/errors/app-error';
import type { StreakRepairRefusal } from '../../domain/services/streak-repair';

/** Why a repair was refused. */
export type StreakRepairUnavailableReason = StreakRepairRefusal | 'NOT_PRO';

/**
 * The wire contract for a refused repair. One code per reason rather
 * than a shared code with the reason nested in the details: clients see
 * the code, and each of these is a different sentence to the learner.
 *
 * Mirrored by `StreakRepairRefusal` in the Flutter client.
 */
export enum StreakRepairErrorCode {
  NotPro = 'STREAK_REPAIR_NOT_PRO',
  NothingToRepair = 'STREAK_REPAIR_NOTHING_TO_REPAIR',
  WindowClosed = 'STREAK_REPAIR_WINDOW_CLOSED',
  AlreadyUsed = 'STREAK_REPAIR_ALREADY_USED',
}

const CODES: Record<StreakRepairUnavailableReason, StreakRepairErrorCode> = {
  NOT_PRO: StreakRepairErrorCode.NotPro,
  NOTHING_TO_REPAIR: StreakRepairErrorCode.NothingToRepair,
  WINDOW_CLOSED: StreakRepairErrorCode.WindowClosed,
  ALREADY_REPAIRED_THIS_MONTH: StreakRepairErrorCode.AlreadyUsed,
};

export class StreakRepairUnavailableError extends AppError {
  constructor(
    public readonly reason: StreakRepairUnavailableReason,
    message = 'This streak cannot be repaired.',
  ) {
    // 409 rather than 400: the request is well formed, the streak's state
    // is simply not one a repair applies to.
    super(CODES[reason], 409, message, { reason });
  }
}
