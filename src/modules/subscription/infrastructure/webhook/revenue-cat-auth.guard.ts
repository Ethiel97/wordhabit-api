import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

/**
 * The webhook's only door.
 *
 * RevenueCat signs nothing: it sends back whatever `Authorization` header
 * you configured in its dashboard, and matching it is the whole of the
 * authentication. That makes this guard the single thing standing
 * between the open internet and a free Pro subscription, so it fails
 * closed — a missing secret refuses every request rather than waving
 * them through.
 */
@Injectable()
export class RevenueCatAuthGuard implements CanActivate {
  private readonly logger = new Logger(RevenueCatAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('REVENUECAT_WEBHOOK_SECRET');
    if (!expected) {
      this.logger.error(
        'REVENUECAT_WEBHOOK_SECRET is unset; refusing every webhook.',
      );
      throw new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers.authorization;
    if (!provided || !this.matches(provided, expected)) {
      this.logger.warn('Rejected a webhook with a bad Authorization header.');
      throw new UnauthorizedException();
    }

    return true;
  }

  /**
   * Constant time, so the comparison cannot be turned into an oracle
   * that leaks the secret one character at a time. Lengths are compared
   * first because timingSafeEqual throws on a mismatch, and that throw
   * would itself be the timing signal.
   */
  private matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
