import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import type { UserLearningRepository } from '../../domain/repositories/user-learning.repository';
import { ClientLanguagesInterceptor } from './client-languages.interceptor';

const definition = (explanationLanguage: string) => ({
  id: `def-${explanationLanguage}`,
  wordId: 'w1',
  explanationLanguage,
  text: `text in ${explanationLanguage}`,
  register: null,
  createdAt: new Date('2026-11-25T03:48:00.000Z'),
});

/** A review queue item as it was served this morning. */
const reviewQueue = () =>
  ApiSuccessResponse.of({
    items: [
      {
        wordId: 'w1',
        term: 'éphémère',
        targetLanguage: 'FR',
        definitions: [definition('FR'), definition('EN'), definition('DE')],
        examples: [
          {
            id: 'ex1',
            wordId: 'w1',
            sentence: 'Un succès éphémère.',
            translation: 'Ein kurzlebiger Erfolg.',
            translationLanguage: 'DE',
            createdAt: new Date('2026-11-25T03:48:00.000Z'),
          },
        ],
      },
    ],
  });

function setup(
  profiles: Array<{ explanationLanguage: string; targetLanguage: string }>,
) {
  const findUserLearningProfiles = jest.fn(() => Promise.resolve(profiles));
  const interceptor = new ClientLanguagesInterceptor({
    findUserLearningProfiles,
  } as unknown as UserLearningRepository);

  const run = async (body: unknown, userId?: string) => {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ user: userId ? { id: userId } : undefined }),
      }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of(body) };
    return lastValueFrom(interceptor.intercept(context, next));
  };

  return { run, findUserLearningProfiles };
}

const languagesOf = (body: unknown) =>
  (body as ReturnType<typeof reviewQueue>).data.items[0].definitions.map(
    (def) => def.explanationLanguage,
  );

describe('ClientLanguagesInterceptor', () => {
  it('keeps German away from a learner none of whose profiles use it', async () => {
    const { run } = setup([
      { explanationLanguage: LanguageCode.FR, targetLanguage: LanguageCode.FR },
    ]);

    const body = (await run(reviewQueue(), 'u1')) as ReturnType<
      typeof reviewQueue
    >;

    // What every installed build can read survives, English included:
    // the client falls back to it when its own language is missing.
    expect(languagesOf(body)).toEqual(['FR', 'EN']);
    expect(body.data.items[0].examples[0]).toMatchObject({
      sentence: 'Un succès éphémère.',
      translation: null,
      translationLanguage: null,
    });
  });

  it('still serves German to a learner whose profile uses it', async () => {
    const { run } = setup([
      { explanationLanguage: LanguageCode.DE, targetLanguage: LanguageCode.FR },
    ]);

    const body = await run(reviewQueue(), 'u1');

    expect(languagesOf(body)).toEqual(['FR', 'EN', 'DE']);
  });

  it('strips it from anonymous responses too', async () => {
    const { run, findUserLearningProfiles } = setup([]);

    const body = await run(reviewQueue());

    expect(languagesOf(body)).toEqual(['FR', 'EN']);
    expect(findUserLearningProfiles).not.toHaveBeenCalled();
  });

  it('costs no lookup when the response holds nothing to strip', async () => {
    const { run, findUserLearningProfiles } = setup([]);
    const body = ApiSuccessResponse.of({
      items: [{ definitions: [definition('FR'), definition('ES')] }],
    });

    expect(await run(body, 'u1')).toBe(body);
    expect(findUserLearningProfiles).not.toHaveBeenCalled();
  });

  it('leaves a profile list alone, whatever its languages', async () => {
    const { run, findUserLearningProfiles } = setup([]);
    const body = ApiSuccessResponse.of([
      { id: 'p1', explanationLanguage: 'DE', targetLanguage: 'FR' },
    ]);

    expect(await run(body, 'u1')).toEqual(body);
    expect(findUserLearningProfiles).not.toHaveBeenCalled();
  });
});
