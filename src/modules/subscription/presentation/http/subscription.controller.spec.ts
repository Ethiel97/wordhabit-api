import { ValidationPipe } from '@nestjs/common';
import { parseRevenueCatWebhook } from '../../application/dtos/revenue-cat-webhook-request.dto';

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

/** Mirrors main.ts, which is what the route has to survive. */
const globalPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('RevenueCat webhook validation', () => {
  it('reaches the handler through the global pipe', async () => {
    // `@Body() body: unknown` leaves the pipe no metatype to validate
    // against, so it hands the payload through untouched.
    const afterPipe: unknown = await globalPipe.transform(REAL_EVENT, {
      type: 'body',
    });

    const payload = await parseRevenueCatWebhook(afterPipe);

    expect(payload.event.type).toBe('EXPIRATION');
    expect(payload.event.app_user_id).toBe('cmsnnve2y0000iitwqs885om3');
    expect(payload.event.entitlement_ids).toEqual(['pro']);
    expect(payload.event.store).toBe('PROMOTIONAL');
  });

  it('still refuses a payload missing the fields the decision reads', async () => {
    await expect(
      parseRevenueCatWebhook({ event: { app_user_id: 'u1' } }),
    ).rejects.toThrow(/Unusable RevenueCat payload/);
  });

  it('refuses a body that is not an event at all', async () => {
    await expect(parseRevenueCatWebhook(null)).rejects.toThrow();
  });
});
