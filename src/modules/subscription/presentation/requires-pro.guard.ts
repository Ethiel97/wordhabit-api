import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SubscriptionService } from '../application/services/subscription.service';
import { AuthenticatedUser } from '../../auth/domain/entities/authenticated-user';

export const REQUIRES_PRO_KEY = 'requiresPro';

/**
 * Gates a route on the Pro entitlement. The client's own check is for
 * responsiveness alone, since it runs on a device the learner controls.
 */
export const RequiresPro = () => SetMetadata(REQUIRES_PRO_KEY, true);

@Injectable()
export class RequiresProGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_PRO_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const userId = request.user?.id;
    // No user means the JWT guard is not in front of this route.
    if (!userId) throw new ForbiddenException();

    if (!(await this.subscriptionService.isPro(userId))) {
      throw new ForbiddenException('This feature requires WordHabit Pro.');
    }

    return true;
  }
}
