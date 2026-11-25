import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, mergeMap, Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';
import {
  USER_LEARNING_REPOSITORY,
  type UserLearningRepository,
} from '../../domain/repositories/user-learning.repository';
import {
  containsUndecodableLanguage,
  LANGUAGES_EVERY_CLIENT_DECODES,
  pruneLanguages,
} from './client-languages';

/**
 * Keeps every response readable by the client that asked for it.
 *
 * A language the corpus holds before every installed build knows it
 * (German, while 2.0.0 is still out there) reaches a learner only when
 * one of their own profiles uses it — so nobody on an old build ever
 * gets one, and a German speaker on a build that knows German still
 * does. Clients send no version, which is why the learner's languages
 * decide rather than the build.
 *
 * Central rather than per query: some twenty repository methods load
 * definitions, and the one a future endpoint forgets is the next
 * blank screen.
 */
@Injectable()
export class ClientLanguagesInterceptor implements NestInterceptor {
  constructor(
    @Inject(USER_LEARNING_REPOSITORY)
    private readonly userLearningRepository: UserLearningRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const userId = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>().user?.id;

    return next
      .handle()
      .pipe(mergeMap((body: unknown) => from(this.filter(body, userId))));
  }

  private async filter(body: unknown, userId?: string): Promise<unknown> {
    if (!containsUndecodableLanguage(body, LANGUAGES_EVERY_CLIENT_DECODES)) {
      return body;
    }

    const allowed = new Set(LANGUAGES_EVERY_CLIENT_DECODES);
    if (userId) {
      const profiles =
        await this.userLearningRepository.findUserLearningProfiles({ userId });
      for (const profile of profiles) {
        allowed.add(profile.explanationLanguage);
        allowed.add(profile.targetLanguage);
      }
    }

    pruneLanguages(body, allowed);
    return body;
  }
}
