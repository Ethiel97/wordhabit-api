import { CreateUserLearningProfileHandler } from './create-user-learning-profile.handler';
import { CreateUserLearningProfileCommand } from '../commands/create-user-learning-profile.command';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import type { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import type { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import type { UserLearningProfile } from '../../domain/entities/user-learning-profile';
import {
  ReminderSlotTakenError,
  UserLearningProfileAlreadyExistsError,
  UserLearningProfileLimitReachedError,
} from '../errors/user-learning-profile-errors';

const existing = (
  targetLanguage: LanguageCode,
  reminderSlot?: NotificationSlot,
): UserLearningProfile =>
  ({
    id: `p-${targetLanguage}`,
    userId: 'u1',
    targetLanguage,
    reminderSlot,
  }) as UserLearningProfile;

function build(options: { isPro?: boolean; profiles?: UserLearningProfile[] }) {
  const createUserLearningProfile = jest
    .fn<Promise<unknown>, [Record<string, unknown>]>()
    .mockImplementation((params) =>
      Promise.resolve({ ...params, id: 'new', themeSlugs: [] }),
    );

  const repository = {
    findUserByEmail: jest.fn().mockResolvedValue({ id: 'u1' }),
    createUser: jest.fn(),
    findUserLearningProfiles: jest
      .fn()
      .mockResolvedValue(options.profiles ?? []),
    findUserLearningProfile: jest.fn().mockResolvedValue(null),
    createUserLearningProfile,
  } as unknown as UserLearningRepository;

  const themes = {
    normalizeAndEnsure: jest.fn().mockResolvedValue([]),
  } as unknown as EnsureThemesExistService;

  const subscriptions = {
    isPro: jest.fn().mockResolvedValue(options.isPro ?? false),
  } as unknown as SubscriptionService;

  return {
    handler: new CreateUserLearningProfileHandler(
      repository,
      themes,
      subscriptions,
    ),
    createUserLearningProfile,
    repository,
  };
}

const command = (
  targetLanguage = LanguageCode.FR,
  reminderSlot?: NotificationSlot,
) =>
  new CreateUserLearningProfileCommand(
    'a@b.c',
    'Ethiel',
    LanguageCode.EN,
    targetLanguage,
    [],
    undefined,
    reminderSlot,
  );

describe('CreateUserLearningProfileHandler', () => {
  it('makes the first profile the main one', async () => {
    const { handler, createUserLearningProfile } = build({ profiles: [] });

    await handler.execute(command());

    expect(createUserLearningProfile.mock.calls[0][0]).toMatchObject({
      isMain: true,
    });
  });

  it('never makes a second profile main', async () => {
    // A client that could name the main profile would keep every
    // language through a downgrade.
    const { handler, createUserLearningProfile } = build({
      isPro: true,
      profiles: [existing(LanguageCode.EN)],
    });

    await handler.execute(command());

    expect(createUserLearningProfile.mock.calls[0][0]).toMatchObject({
      isMain: false,
    });
  });

  it('holds a free account to one profile', async () => {
    const { handler } = build({ profiles: [existing(LanguageCode.EN)] });

    await expect(handler.execute(command())).rejects.toBeInstanceOf(
      UserLearningProfileLimitReachedError,
    );
  });

  it('holds a subscriber to three', async () => {
    const { handler } = build({
      isPro: true,
      profiles: [
        existing(LanguageCode.EN),
        existing(LanguageCode.ES),
        existing(LanguageCode.FR),
      ],
    });

    await expect(handler.execute(command())).rejects.toBeInstanceOf(
      UserLearningProfileLimitReachedError,
    );
  });

  it('refuses a reminder slot another language holds', async () => {
    const { handler } = build({
      isPro: true,
      profiles: [existing(LanguageCode.EN, NotificationSlot.MORNING)],
    });

    await expect(
      handler.execute(command(LanguageCode.FR, NotificationSlot.MORNING)),
    ).rejects.toBeInstanceOf(ReminderSlotTakenError);
  });

  it('accepts a slot no other profile holds', async () => {
    const { handler, createUserLearningProfile } = build({
      isPro: true,
      profiles: [existing(LanguageCode.EN, NotificationSlot.MORNING)],
    });

    await handler.execute(command(LanguageCode.FR, NotificationSlot.EVENING));

    expect(createUserLearningProfile.mock.calls[0][0]).toMatchObject({
      reminderSlot: NotificationSlot.EVENING,
    });
  });

  it('refuses a language the learner already holds', async () => {
    const { handler, repository } = build({ isPro: true, profiles: [] });
    (repository.findUserLearningProfile as jest.Mock).mockResolvedValue(
      existing(LanguageCode.FR),
    );

    await expect(handler.execute(command())).rejects.toBeInstanceOf(
      UserLearningProfileAlreadyExistsError,
    );
  });
});
