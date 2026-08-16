-- Webhook events are applied in the order they arrive, which is not the
-- order they happened: RevenueCat retries a rejected delivery for hours,
-- so a stale cancellation can land after the grant that superseded it.
-- Recording the event's own instant lets the writer refuse to go back.
ALTER TABLE "users" ADD COLUMN "subscriptionEventAt" TIMESTAMP(3);
