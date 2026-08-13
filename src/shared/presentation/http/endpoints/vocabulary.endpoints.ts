export const VOCABULARY = {
  BASE: 'vocabulary/words',
  CREATE: '',
  GET_BY_ID: ':id',
  SHARED: ':id/shared',
  SEARCH: '/search',
  LIST: '',
} as const;

export const THEMES = {
  BASE: 'vocabulary/themes',
  CREATE: '',
  LIST: '',
  GET_BY_SLUG: ':slug',
  UPDATE: ':id',
  DELETE: ':id',
} as const;
