export const USER_LEARNING = {
  BASE: 'user-learning',
  CREATE_PROFILE: 'profiles',
  GET_ACTIVE_PROFILE: 'profiles/active',
  LIST_PROFILES: 'profiles',
  SET_THEMES: 'profiles/themes',
  ACTIVATE_PROFILE: 'profiles/:profileId/activate',
} as const;

export const ONBOARDING = {
  BASE: 'onboarding',
  COMPLETE: '',
} as const;
