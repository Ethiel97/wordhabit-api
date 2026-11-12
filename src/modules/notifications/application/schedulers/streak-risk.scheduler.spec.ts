import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { StreakRiskScheduler } from './streak-risk.scheduler';
import { SEND_STREAK_RISK_NOTIFICATION_JOB } from '../../infrastructure/queue/notifications-queue.constants';

function build(enabled: string | undefined) {
  const add = jest.fn().mockResolvedValue(undefined);
  const scheduler = new StreakRiskScheduler(
    { add } as unknown as Queue,
    { get: jest.fn().mockReturnValue(enabled) } as unknown as ConfigService,
  );

  return { scheduler, add };
}

describe('StreakRiskScheduler', () => {
  it('enqueues nothing while the switch is off or unset', async () => {
    for (const value of [undefined, 'false', '1']) {
      const { scheduler, add } = build(value);

      await scheduler.enqueueStreakRiskJob();

      expect(add).not.toHaveBeenCalled();
    }
  });

  it('enqueues one deduplicated sweep when the switch is on', async () => {
    const { scheduler, add } = build('true');

    await scheduler.enqueueStreakRiskJob();

    expect(add).toHaveBeenCalledTimes(1);
    const [name, , options] = add.mock.calls[0] as [
      string,
      { tickAt: string },
      { jobId: string },
    ];
    expect(name).toBe(SEND_STREAK_RISK_NOTIFICATION_JOB);
    expect(options.jobId).toMatch(/^streak-risk-[^:]+$/);
  });
});
