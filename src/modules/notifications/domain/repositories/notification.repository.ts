import {
  NotificationChannel,
  NotificationDevice,
  NotificationPreferencesResult,
  NotificationSlot,
  Platform,
} from '../entities/notification';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export type UpdateNotificationPreferenceParams = {
  userId: string;
  channel: NotificationChannel;
  enabled?: boolean;
  slot?: NotificationSlot | null;
};

export type RegisterNotificationDeviceParams = {
  userId: string;
  token: string;
  timeZone: string;
  platform: Platform;
};

export type DeleteNotificationDeviceParams = {
  userId: string;
  token: string;
};

export type FindDueRecipientsParams = {
  channel: NotificationChannel;
  timeZone: string;
  slot: NotificationSlot;
  /** The recipients' own day, used against the delivery ledger. */
  localDate: string;
};

export type DueRecipient = {
  userId: string;
  /** The profile whose word is announced; absent on person-level channels. */
  userLearningProfileId?: string;
  interfaceLanguage: string;
  tokens: string[];
};

export type RecordDeliveryParams = {
  userId: string;
  userLearningProfileId?: string;
  channel: NotificationChannel;
  localDate: string;
};

export interface NotificationRepository {
  findPreferencesByUserId(
    userId: string,
  ): Promise<NotificationPreferencesResult>;

  updateNotificationPreference(
    params: UpdateNotificationPreferenceParams,
  ): Promise<NotificationPreferencesResult>;
  registerNotificationDevice(
    params: RegisterNotificationDeviceParams,
  ): Promise<NotificationDevice>;
  deleteNotificationDevice(
    params: DeleteNotificationDeviceParams,
  ): Promise<boolean>;

  /** Distinct zones with a registered device — the sweep's starting set. */
  findActiveTimeZones(): Promise<string[]>;

  /**
   * Profiles due at this slot that have not been served for [localDate].
   * One row per profile, not per user: a subscriber's languages are
   * announced at their own hours.
   */
  findDueRecipients(params: FindDueRecipientsParams): Promise<DueRecipient[]>;

  /**
   * Claims today's delivery, returning false when someone already has
   * it. Called *before* sending: the unique index is what stops two
   * workers, or a replayed job, from notifying twice.
   */
  recordDelivery(params: RecordDeliveryParams): Promise<boolean>;

  /** Drops devices the platform reported as gone. */
  deleteDevicesByTokens(tokens: string[]): Promise<number>;
}
