import { UpdateUserLearningProfileHandler } from './update-user-learning-profile.handler';
import { UpdateUserLearningProfileCommand } from '../commands/update-user-learning-profile.command';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import type { EnsureThemesExistService } from '../services/ensure-themes-exist.service';
import type { SubscriptionService } from '../../../subscription/application/services/subscription.service';
import type { UserLearningProfile } from '../../domain/entities/user-learning-profile';
import { UserLearningProfileAlreadyExistsError } from '../errors/user-learning-profile-errors';

const profile = (
  id: string,
  targetLanguage: LanguageCode,
): UserLearningProfile =>
  ({
    id,
    userId: 'u1',
    targetLanguage,
    isMain: true,
  }) as UserLearningProfile;

function build(options: { holder?: UserLearningProfile | null } = {}) {
  const updateUserLearningProfile = jest
    .fn<Promise<unknown>, [Record<string, unknown>]>()
    .mockImplementation((params) => Promise.resolve({ ...params }));
  const findUserLearningProfile = jest
    .fn()
    .mockResolvedValue(options.holder ?? null);

  const repository = {
    findUserLearningProfileById: jest
      .fn()
      .mockResolvedValue(profile('p1', LanguageCode.EN)),
    findUserLearningProfile,
    updateUserLearningProfile,
  } as unknown as UserLearningRepository;

  const themes = {
    normalizeAndEnsure: jest.fn().mockResolvedValue([]),
  } as unknown as EnsureThemesExistService;

  const subscriptions = {
    isPro: jest.fn().mockResolvedValue(true),
  } as unknown as SubscriptionService;

  return {
    handler: new UpdateUserLearningProfileHandler(
      repository,
      themes,
      subscriptions,
    ),
    findUserLearningProfile,
    updateUserLearningProfile,
  };
}

describe('UpdateUserLearningProfileHandler', () => {
  it('refuses a language the learner already holds', async () => {
    const { handler, updateUserLearningProfile } = build({
      holder: profile('p2', LanguageCode.FR),
    });

    await expect(
      handler.execute(
        new UpdateUserLearningProfileCommand(
          'u1',
          'p1',
          undefined,
          undefined,
          LanguageCode.FR,
        ),
      ),
    ).rejects.toBeInstanceOf(UserLearningProfileAlreadyExistsError);

    expect(updateUserLearningProfile).not.toHaveBeenCalled();
  });

  it('allows a language no other profile holds', async () => {
    const { handler, updateUserLearningProfile } = build();

    await handler.execute(
      new UpdateUserLearningProfileCommand(
        'u1',
        'p1',
        undefined,
        undefined,
        LanguageCode.FR,
      ),
    );

    expect(updateUserLearningProfile).toHaveBeenCalledWith(
      expect.objectContaining({ targetLanguage: LanguageCode.FR }),
    );
  });

  it('does not look for a holder when the language is unchanged', async () => {
    const { handler, findUserLearningProfile, updateUserLearningProfile } =
      build();

    await handler.execute(
      new UpdateUserLearningProfileCommand(
        'u1',
        'p1',
        undefined,
        undefined,
        LanguageCode.EN,
      ),
    );

    expect(findUserLearningProfile).not.toHaveBeenCalled();
    expect(updateUserLearningProfile).toHaveBeenCalled();
  });
});
