import { Job } from 'bullmq';
import { StreakRiskSenderProcessor } from './streak-risk-sender.processor';
import { SEND_STREAK_RISK_NOTIFICATION_JOB } from '../../../modules/notifications/infrastructure/queue/notifications-queue.constants';
import type {
  NotificationRepository,
  StreakRiskRecipient,
} from '../../../modules/notifications/domain/repositories/notification.repository';
import type { PushMessage } from '../../application/ports/push-sender.port';

const recipient = (
  overrides: Partial<StreakRiskRecipient> = {},
): StreakRiskRecipient => ({
  userId: 'u1',
  interfaceLanguage: 'EN',
  currentStreak: 4,
  tokens: ['t1'],
  ...overrides,
});

function build(
  options: {
    recipients?: StreakRiskRecipient[];
    claimed?: boolean;
    invalidTokens?: string[];
  } = {},
) {
  const findStreakRiskRecipients = jest
    .fn()
    .mockResolvedValue(options.recipients ?? []);
  const recordDelivery = jest
    .fn<Promise<boolean>, [Record<string, unknown>]>()
    .mockResolvedValue(options.claimed ?? true);
  const deleteDevicesByTokens = jest.fn().mockResolvedValue(1);

  const notifications = {
    findActiveTimeZones: jest.fn().mockResolvedValue(['UTC']),
    findStreakRiskRecipients,
    recordDelivery,
    deleteDevicesByTokens,
  } as unknown as NotificationRepository;

  const send = jest
    .fn<Promise<{ sent: number; invalidTokens: string[] }>, [PushMessage[]]>()
    .mockResolvedValue({ sent: 1, invalidTokens: options.invalidTokens ?? [] });

  return {
    processor: new StreakRiskSenderProcessor(notifications, { send }),
    findStreakRiskRecipients,
    recordDelivery,
    deleteDevicesByTokens,
    send,
  };
}

const job = (
  name = SEND_STREAK_RISK_NOTIFICATION_JOB,
  tickAt = '2026-08-11T19:30:00.000Z',
) => ({ name, data: { tickAt } }) as Job<{ tickAt: string }>;

describe('StreakRiskSenderProcessor', () => {
  it('looks for learners whose last active day was yesterday', async () => {
    const { processor, findStreakRiskRecipients } = build();

    await processor.process(job());

    expect(findStreakRiskRecipients).toHaveBeenCalledWith({
      timeZone: 'UTC',
      localDate: '2026-08-11',
      yesterday: '2026-08-10',
    });
  });

  it('does nothing outside the evening window', async () => {
    const { processor, findStreakRiskRecipients } = build();

    const result = await processor.process(
      job(SEND_STREAK_RISK_NOTIFICATION_JOB, '2026-08-11T07:30:00.000Z'),
    );

    expect(result.notified).toBe(0);
    expect(findStreakRiskRecipients).not.toHaveBeenCalled();
  });

  it('claims a person-level delivery before sending', async () => {
    const { processor, recordDelivery, send } = build({
      recipients: [recipient()],
    });

    await processor.process(job());

    expect(recordDelivery).toHaveBeenCalledWith({
      userId: 'u1',
      channel: 'STREAK_RISK',
      localDate: '2026-08-11',
    });
    expect(recordDelivery.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[0],
    );
  });

  it('sends nothing when another worker already holds the claim', async () => {
    const { processor, send } = build({
      recipients: [recipient()],
      claimed: false,
    });

    const result = await processor.process(job());

    expect(result.notified).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('skips a learner without a device, without claiming the day', async () => {
    const { processor, recordDelivery, send } = build({
      recipients: [recipient({ tokens: [] })],
    });

    await processor.process(job());

    expect(recordDelivery).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a payload the app routes, on the channel it created', async () => {
    const { processor, send } = build({
      recipients: [recipient({ currentStreak: 4, interfaceLanguage: 'FR' })],
    });

    await processor.process(job());

    const [message] = send.mock.calls[0][0];
    expect(message).toMatchObject({
      tokens: ['t1'],
      androidChannelId: 'streak_risk',
      data: { type: 'STREAK_RISK' },
    });
    expect(message.body).toContain('série de 4 jours');
  });

  it('drops the devices the platform reports as gone', async () => {
    const { processor, deleteDevicesByTokens } = build({
      recipients: [recipient({ tokens: ['t1', 'dead'] })],
      invalidTokens: ['dead'],
    });

    await processor.process(job());

    expect(deleteDevicesByTokens).toHaveBeenCalledWith(['dead']);
  });

  it('ignores a job it does not own', async () => {
    const { processor, findStreakRiskRecipients } = build();

    const result = await processor.process(job('something-else'));

    expect(result.notified).toBe(0);
    expect(findStreakRiskRecipients).not.toHaveBeenCalled();
  });
});
