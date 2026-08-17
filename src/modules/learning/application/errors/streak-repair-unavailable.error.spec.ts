import {
  StreakRepairErrorCode,
  StreakRepairUnavailableError,
} from './streak-repair-unavailable.error';

describe('StreakRepairUnavailableError', () => {
  // Mirrored by StreakRepairRefusal in the Flutter client, which keys its
  // copy off these strings. A rename here turns every refusal into the
  // generic error message over there, silently.
  it.each([
    ['NOT_PRO', StreakRepairErrorCode.NotPro],
    ['NOTHING_TO_REPAIR', StreakRepairErrorCode.NothingToRepair],
    ['WINDOW_CLOSED', StreakRepairErrorCode.WindowClosed],
    ['ALREADY_REPAIRED_THIS_MONTH', StreakRepairErrorCode.AlreadyUsed],
  ] as const)('maps %s to its own code', (reason, code) => {
    const error = new StreakRepairUnavailableError(reason);

    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(409);
    expect(error.details).toMatchObject({ reason });
  });

  it('keeps the codes distinct', () => {
    const codes = Object.values(StreakRepairErrorCode);

    expect(new Set(codes).size).toBe(codes.length);
  });
});
