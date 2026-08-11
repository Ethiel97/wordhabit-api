import { Job } from 'bullmq';
import { DailyWordSenderProcessor } from './daily-word-sender.processor';
import { SEND_DAILY_WORD_NOTIFICATION_JOB } from '../../../modules/notifications/infrastructure/queue/notifications-queue.constants';
import type {
  DueRecipient,
  NotificationRepository,
} from '../../../modules/notifications/domain/repositories/notification.repository';
import type { PushSender } from '../../application/ports/push-sender.port';
import type { TodayWordService } from '../../../modules/learning/application/services/today-word.service';

const recipient = (
  userLearningProfileId: string,
  overrides: Partial<DueRecipient> = {},
): DueRecipient => ({
  userId: 'u1',
  userLearningProfileId,
  interfaceLanguage: 'EN',
  tokens: ['t1'],
  ...overrides,
});

function build(options: {
  recipients?: DueRecipient[];
  assign?: jest.Mock;
  claimed?: boolean;
}) {
  const recordDelivery = jest
    .fn<Promise<boolean>, [Record<string, unknown>]>()
    .mockResolvedValue(options.claimed ?? true);

  const notifications = {
    findActiveTimeZones: jest.fn().mockResolvedValue(['UTC']),
    findDueRecipients: jest.fn().mockResolvedValue(options.recipients ?? []),
    recordDelivery,
    deleteDevicesByTokens: jest.fn().mockResolvedValue(0),
  } as unknown as NotificationRepository;

  const send = jest
    .fn<Promise<{ invalidTokens: string[] }>, [unknown[]]>()
    .mockResolvedValue({ invalidTokens: [] });
  const pushSender = { send } as unknown as PushSender;

  const getOrAssignForProfileId =
    options.assign ??
    jest
      .fn()
      .mockImplementation((profileId: string) =>
        Promise.resolve({ word: { id: `w-${profileId}`, term: profileId } }),
      );

  const todayWord = {
    getOrAssignForProfileId,
  } as unknown as TodayWordService;

  return {
    processor: new DailyWordSenderProcessor(
      notifications,
      pushSender,
      todayWord,
    ),
    recordDelivery,
    send,
    getOrAssignForProfileId,
  };
}

const job = () =>
  ({
    name: SEND_DAILY_WORD_NOTIFICATION_JOB,
    // 07:30 UTC is the morning slot for a UTC device.
    data: { tickAt: new Date('2026-08-11T07:30:00.000Z').toISOString() },
  }) as Job<{ tickAt: string }>;

describe('DailyWordSenderProcessor', () => {
  it('announces the profile that is due, not the active one', async () => {
    const { processor, getOrAssignForProfileId } = build({
      recipients: [recipient('p-fr')],
    });

    await processor.process(job());

    expect(getOrAssignForProfileId).toHaveBeenCalledWith(
      'p-fr',
      expect.any(String),
    );
  });

  it('claims the delivery against the profile', async () => {
    // Keyed on the user, a subscriber's second language would be marked
    // as served by the first and never announced.
    const { processor, recordDelivery } = build({
      recipients: [recipient('p-fr')],
    });

    await processor.process(job());

    expect(recordDelivery.mock.calls[0][0]).toMatchObject({
      userId: 'u1',
      userLearningProfileId: 'p-fr',
    });
  });

  it('sends one message per due profile of the same learner', async () => {
    const { processor, send } = build({
      recipients: [
        recipient('p-en', { tokens: ['t1'] }),
        recipient('p-fr', { tokens: ['t1'] }),
      ],
    });

    const result = await processor.process(job());

    expect(result.notified).toBe(2);
    expect(send.mock.calls[0][0]).toHaveLength(2);
  });

  it('skips a language whose corpus is dry without dropping the batch', async () => {
    const assign = jest
      .fn()
      .mockRejectedValueOnce(new Error('no candidate'))
      .mockResolvedValueOnce({ word: { id: 'w1', term: 'ephemeral' } });

    const { processor, send } = build({
      recipients: [recipient('p-fr'), recipient('p-en')],
      assign,
    });

    const result = await processor.process(job());

    expect(result.notified).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the delivery was already claimed', async () => {
    const { processor, send } = build({
      recipients: [recipient('p-fr')],
      claimed: false,
    });

    const result = await processor.process(job());

    expect(result.notified).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
