import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FREE_SUBSCRIPTION,
  SubscriptionState,
  SubscriptionTier,
} from '../../domain/entities/subscription';
import { SubscriberSource } from '../../domain/ports/subscriber-source.port';
import { PRO_ENTITLEMENT } from '../../domain/services/revenue-cat-event';

interface RevenueCatEntitlement {
  expires_date?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
  };
}

@Injectable()
export class RevenueCatSubscriberSource implements SubscriberSource {
  private readonly logger = new Logger(RevenueCatSubscriberSource.name);

  constructor(private readonly config: ConfigService) {}

  async read(appUserId: string): Promise<SubscriptionState | null> {
    const key = this.config.get<string>('REVENUECAT_SECRET_KEY');
    if (!key) {
      this.logger.warn('REVENUECAT_SECRET_KEY is unset; sync disabled.');
      return null;
    }

    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );

    // 404 means RevenueCat has never seen this id, the normal answer for
    // someone who never opened a paywall.
    if (response.status === 404) return FREE_SUBSCRIPTION;

    if (!response.ok) {
      this.logger.error(
        `RevenueCat answered ${response.status} for ${appUserId}.`,
      );
      return null;
    }

    const body = (await response.json()) as RevenueCatSubscriberResponse;
    const entitlement = body.subscriber?.entitlements?.[PRO_ENTITLEMENT];
    if (!entitlement) return FREE_SUBSCRIPTION;

    // A lifetime grant carries no expiry; anything past is already over.
    const expiresAt = entitlement.expires_date
      ? new Date(entitlement.expires_date)
      : null;
    if (expiresAt !== null && expiresAt.getTime() <= Date.now()) {
      return FREE_SUBSCRIPTION;
    }

    return { tier: SubscriptionTier.PRO, expiresAt, store: null };
  }
}
