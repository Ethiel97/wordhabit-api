import { ValidationPipe } from '@nestjs/common';
import { RevenueCatWebhookRequestDto } from '../../application/dtos/revenue-cat-webhook-request.dto';

/**
 * A real RevenueCat payload, trimmed of nothing: every field here was
 * rejected by the global pipe's whitelist, so the webhook never reached
 * the handler and the promotional grant never landed in the database.
 */
const REAL_EVENT = {
  api_version: '1.0',
  event: {
    aliases: [
      '$RCAnonymousID:dc5c684524fc4a61937afc7e61165952',
      'cmsnnve2y0000iitwqs885om3',
    ],
    app_id: 'app33c1247dbe',
    app_user_id: 'cmsnnve2y0000iitwqs885om3',
    commission_percentage: null,
    country_code: null,
    currency: 'USD',
    entitlement_id: 'pro',
    entitlement_ids: ['pro'],
    environment: 'PRODUCTION',
    event_timestamp_ms: 1786766161492,
    expiration_at_ms: 1786766161488,
    expiration_reason: 'UNSUBSCRIBE',
    id: '192C33D7-CFE1-4411-B400-AFDB4944D6AF',
    is_family_share: null,
    period_type: 'PROMOTIONAL',
    price: 0,
    product_id: 'rc_promo_pro_lifetime',
    purchased_at_ms: 1786765756271,
    store: 'PROMOTIONAL',
    type: 'EXPIRATION',
  },
};

describe('RevenueCat webhook validation', () => {
  // The route's own pipe, not the global one it deliberately replaces.
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  const metadata = {
    type: 'body' as const,
    metatype: RevenueCatWebhookRequestDto,
  };

  it('accepts a full RevenueCat payload', async () => {
    const result = (await pipe.transform(
      REAL_EVENT,
      metadata,
    )) as RevenueCatWebhookRequestDto;

    expect(result.event.type).toBe('EXPIRATION');
    expect(result.event.app_user_id).toBe('cmsnnve2y0000iitwqs885om3');
    expect(result.event.entitlement_ids).toEqual(['pro']);
  });

  it('still refuses a payload missing the fields the decision reads', async () => {
    await expect(
      pipe.transform({ event: { app_user_id: 'u1' } }, metadata),
    ).rejects.toThrow();
  });
});
