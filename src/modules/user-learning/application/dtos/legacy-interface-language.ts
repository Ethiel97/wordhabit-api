import { applyDecorators } from '@nestjs/common';
import { Expose, Transform } from 'class-transformer';

/**
 * `explanationLanguage` was called `interfaceLanguage` on the wire, and
 * the store versions already installed keep sending and reading that
 * name. Both helpers here exist only for them: drop this file once no
 * installed version sends `interfaceLanguage` any more.
 */

/**
 * Fills `explanationLanguage` from the old field when only the old
 * field was sent. `@Expose` is what makes class-transformer run the
 * transform on a key absent from the payload.
 */
export function FromLegacyInterfaceLanguage(): PropertyDecorator {
  return applyDecorators(
    Expose(),
    Transform(
      ({ value, obj }: { value: unknown; obj: Record<string, unknown> }) =>
        value ?? obj.interfaceLanguage,
    ),
  );
}

/** Echoes `explanationLanguage` under its old name, for old readers. */
export function withLegacyInterfaceLanguage<T>(result: T): T {
  if (Array.isArray(result)) {
    return result.map((item: unknown) =>
      withLegacyInterfaceLanguage(item),
    ) as T;
  }
  if (result && typeof result === 'object' && 'explanationLanguage' in result) {
    return { ...result, interfaceLanguage: result.explanationLanguage };
  }
  return result;
}
