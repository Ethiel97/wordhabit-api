/**
 * Values are the wire contract: the mobile client sends and reads these
 * exact codes, and they must equal the Prisma enum members.
 */
export enum NotificationChannel {
  DAILY_WORD = 'DAILY_WORD',
  STREAK_RISK = 'STREAK_RISK',
}

export enum NotificationSlot {
  MORNING = 'MORNING',
  MIDDAY = 'MIDDAY',
  EVENING = 'EVENING',
}

export enum Platform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

/** Channels the sender can deliver, hence the only ones exposed. */
export const SUPPORTED_CHANNELS: readonly NotificationChannel[] = [
  NotificationChannel.DAILY_WORD,
  NotificationChannel.STREAK_RISK,
];

export const DEFAULT_PREFERENCE_BY_CHANNEL: Readonly<
  Record<
    NotificationChannel,
    { enabled: boolean; slot: NotificationSlot | null }
  >
> = {
  [NotificationChannel.DAILY_WORD]: {
    enabled: true,
    slot: NotificationSlot.MORNING,
  },
  [NotificationChannel.STREAK_RISK]: { enabled: false, slot: null },
};

export type NotificationPreference = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  slot: NotificationSlot | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationPreferencesResult = {
  channels: Array<{
    channel: NotificationChannel;
    enabled: boolean;
    slot: NotificationSlot | null;
  }>;
};

export type NotificationDevice = {
  id: string;
  userId: string;
  token: string;
  timeZone: string;
  lastSeenAt: Date;
  platform: Platform;
  createdAt: Date;
  updatedAt: Date;
};
