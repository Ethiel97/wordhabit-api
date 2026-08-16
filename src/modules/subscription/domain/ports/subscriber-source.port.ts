import { SubscriptionState } from '../entities/subscription';

export const SUBSCRIBER_SOURCE = Symbol('SUBSCRIBER_SOURCE');

/**
 * Reads a subscriber's entitlement from the store's own records.
 *
 * The client asks for a refresh but never states the answer: a request
 * body claiming "I am Pro" would be a paywall anyone could type.
 */
export interface SubscriberSource {
  /** Null when the store has no record of this user. */
  read(appUserId: string): Promise<SubscriptionState | null>;
}
