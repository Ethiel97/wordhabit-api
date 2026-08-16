export const USER_LEARNING = {
  BASE: 'user-learning',
  CREATE_PROFILE: 'profiles',
  UPDATE_PROFILE: 'profiles/:profileId',
  DELETE_PROFILE: 'profiles/:profileId',
  GET_ACTIVE_PROFILE: 'profiles/active',
  LIST_PROFILES: 'profiles',
  ACTIVATE_PROFILE: 'profiles/:profileId/activate',
  SWAP_REMINDER: 'profiles/:profileId/reminder-slot',
} as const;

export const ONBOARDING = {
  BASE: 'onboarding',
  COMPLETE: '',
} as const;
