import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';

/**
 * Languages every installed client can decode.
 *
 * A client decodes a definition's `explanationLanguage` and an example's
 * `translationLanguage` against an enum compiled into it, and rejects the
 * whole response on a value it does not know — one German definition on
 * one word blanked the review queue for every 2.0.0 install. Grow this
 * set only once no supported build is missing the new value.
 */
export const LANGUAGES_EVERY_CLIENT_DECODES: ReadonlySet<string> = new Set([
  LanguageCode.EN,
  LanguageCode.ES,
  LanguageCode.FR,
]);

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !(value instanceof Date);

/** A stored definition, as every endpoint serialises it. */
const isDefinition = (value: unknown): value is Json =>
  isObject(value) &&
  typeof value.explanationLanguage === 'string' &&
  typeof value.text === 'string';

/** A stored example, which may carry a translation. */
const isTranslatedExample = (value: unknown): value is Json =>
  isObject(value) &&
  typeof value.sentence === 'string' &&
  typeof value.translationLanguage === 'string';

/**
 * Whether [body] holds a definition or a translation in a language
 * outside [decodable]. Cheap, and true for almost no response, so the
 * caller only looks the learner's own languages up when it matters.
 */
export function containsUndecodableLanguage(
  body: unknown,
  decodable: ReadonlySet<string>,
): boolean {
  if (Array.isArray(body)) {
    return body.some((item) => containsUndecodableLanguage(item, decodable));
  }
  if (!isObject(body)) return false;

  if (
    isDefinition(body) &&
    !decodable.has(body.explanationLanguage as string)
  ) {
    return true;
  }
  if (
    isTranslatedExample(body) &&
    !decodable.has(body.translationLanguage as string)
  ) {
    return true;
  }
  return Object.values(body).some((value) =>
    containsUndecodableLanguage(value, decodable),
  );
}

/**
 * Drops, in place, what a client was not built to read: definitions in
 * a language outside [allowed] leave their list, and a translation in
 * one is cleared while its sentence stays.
 */
export function pruneLanguages(
  body: unknown,
  allowed: ReadonlySet<string>,
): void {
  if (Array.isArray(body)) {
    for (let index = body.length - 1; index >= 0; index -= 1) {
      const item: unknown = body[index];
      if (
        isDefinition(item) &&
        !allowed.has(item.explanationLanguage as string)
      ) {
        body.splice(index, 1);
      } else {
        pruneLanguages(item, allowed);
      }
    }
    return;
  }
  if (!isObject(body)) return;

  if (
    isTranslatedExample(body) &&
    !allowed.has(body.translationLanguage as string)
  ) {
    body.translation = null;
    body.translationLanguage = null;
  }
  for (const value of Object.values(body)) {
    pruneLanguages(value, allowed);
  }
}
