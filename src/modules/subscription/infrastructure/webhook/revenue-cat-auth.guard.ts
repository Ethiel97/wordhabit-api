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
 * The webhook's only door. RevenueCat signs nothing: it echoes the
 * `Authorization` header configured in its dashboard, and matching it is
 * the whole authentication. Fails closed, since a missing secret would
 * otherwise wave the open internet through to a free Pro subscription.
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
   * Constant time, so the comparison is not an oracle leaking the secret
   * one character at a time. Lengths first: timingSafeEqual throws on a
   * mismatch, and the throw would itself be the signal.
   */
  private matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
