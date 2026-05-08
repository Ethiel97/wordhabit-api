import { AppError } from '../../../../shared/application/errors/app-error';

export const UNKNOWN_THEME_SLUGS_ERROR_CODE = 'UNKNOWN_THEME_SLUGS';
export class UnknownThemeSlugsError extends AppError {
  constructor(missingSlugs: string[]) {
    super(
      UNKNOWN_THEME_SLUGS_ERROR_CODE,
      400,
      `The following themes were not found: ${missingSlugs.join(', ')}`,
      { missingSlugs },
    );
  }
}
