import { buildExplorationBrief } from './exploration-brief';
import { LanguageCode } from '../../vocabulary/domain/entities/language-code';

const briefOn = (
  isoDate: string,
  targetLanguage = LanguageCode.EN,
  count = 30,
) =>
  buildExplorationBrief({
    targetLanguage,
    count,
    on: new Date(isoDate),
  });

describe('buildExplorationBrief', () => {
  it('is stable for a given day and language', () => {
    // A retried job must explore the same corner, not drift to another.
    expect(briefOn('2026-07-30T02:00:00Z')).toEqual(
      briefOn('2026-07-30T23:59:00Z'),
    );
  });

  it('moves to another semantic field the next day', () => {
    expect(briefOn('2026-07-30T02:00:00Z').semanticField).not.toBe(
      briefOn('2026-07-31T02:00:00Z').semanticField,
    );
  });

  it('sends the three languages to different fields on the same night', () => {
    const fields = [LanguageCode.EN, LanguageCode.FR, LanguageCode.ES].map(
      (language) => briefOn('2026-07-30T02:00:00Z', language).semanticField,
    );

    expect(new Set(fields).size).toBe(3);
  });

  it('splits the batch across all three difficulties', () => {
    const brief = briefOn('2026-07-30T02:00:00Z', LanguageCode.EN, 30);

    expect(brief.beginner).toBe(10);
    expect(brief.intermediate).toBe(10);
    expect(brief.advanced).toBe(10);
  });

  it('never loses an entry to rounding', () => {
    // 29 does not divide by three; the remainder has to land somewhere or
    // the model is asked for fewer words than the batch requested.
    const brief = briefOn('2026-07-30T02:00:00Z', LanguageCode.EN, 29);

    expect(brief.beginner + brief.intermediate + brief.advanced).toBe(29);
  });

  it('always asks for at least two expressions', () => {
    expect(
      briefOn('2026-07-30T02:00:00Z', LanguageCode.EN, 3).minExpressions,
    ).toBe(2);
    expect(
      briefOn('2026-07-30T02:00:00Z', LanguageCode.EN, 30).minExpressions,
    ).toBe(6);
  });
});
