export const USER_LEARNING = {
  BASE: 'user-learning',
  CREATE_PROFILE: 'profiles',
  GET_ACTIVE_PROFILE: 'users/:userId/profiles/active',
  LIST_PROFILES: 'users/:userId/profiles',
  SET_THEMES: 'profiles/:profileId/themes',
  ACTIVATE_PROFILE: 'users/:userId/profiles/:profileId/activate',
} as const;

export const ONBOARDING = {
  BASE: 'onboarding',
  COMPLETE: '',
} as const;
