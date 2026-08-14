import {
  DeleteNotificationDeviceParams,
  DueRecipient,
  FindDueRecipientsParams,
  NotificationRepository,
  RecordDeliveryParams,
  RegisterNotificationDeviceParams,
  UpdateNotificationPreferenceParams,
} from '../../domain/repositories/notification.repository';
import {
  DEFAULT_PREFERENCE_BY_CHANNEL,
  NotificationChannel,
  NotificationDevice,
  NotificationPreferencesResult,
  NotificationSlot,
  Platform,
  SUPPORTED_CHANNELS,
} from '../../domain/entities/notification';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPreferencesByUserId(
    userId: string,
  ): Promise<NotificationPreferencesResult> {
    await this.ensureDefaultPreferences(userId);

    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId, channel: { in: [...SUPPORTED_CHANNELS] } },
      orderBy: { channel: 'asc' },
    });

    return {
      channels: preferences.map((preference) => ({
        channel: preference.channel as NotificationChannel,
        enabled: preference.enabled,
        slot: preference.slot as NotificationSlot | null,
      })),
    };
  }

  async updateNotificationPreference(
    params: UpdateNotificationPreferenceParams,
  ): Promise<NotificationPreferencesResult> {
    // undefined leaves alone, null clears: Prisma only honours the
    // clear when the key is present.
    const changes = {
      ...(params.enabled !== undefined && { enabled: params.enabled }),
      ...(params.slot !== undefined && {
        slot: params.slot,
      }),
    };
    const defaults = DEFAULT_PREFERENCE_BY_CHANNEL[params.channel];

    await this.prisma.notificationPreference.upsert({
      where: {
        userId_channel: {
          userId: params.userId,
          channel: params.channel,
        },
      },
      update: changes,
      create: {
        userId: params.userId,
        channel: params.channel,
        enabled: params.enabled ?? defaults.enabled,
        slot: params.slot ?? defaults.slot,
      },
    });

    return this.findPreferencesByUserId(params.userId);
  }

  async registerNotificationDevice(
    params: RegisterNotificationDeviceParams,
  ): Promise<NotificationDevice> {
    const result = await this.prisma.device.upsert({
      where: { token: params.token },
      // Reassigned: a resold phone keeps its token, and the previous
      // owner must stop receiving.
      update: {
        userId: params.userId,
        platform: params.platform,
        timeZone: params.timeZone,
        lastSeenAt: new Date(),
      },
      create: {
        userId: params.userId,
        token: params.token,
        platform: params.platform,
        timeZone: params.timeZone,
        lastSeenAt: new Date(),
      },
    });

    return {
      id: result.id,
      userId: result.userId,
      token: result.token,
      platform: result.platform as Platform,
      timeZone: result.timeZone,
      lastSeenAt: result.lastSeenAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async deleteNotificationDevice(
    params: DeleteNotificationDeviceParams,
  ): Promise<boolean> {
    const result = await this.prisma.device.deleteMany({
      where: { userId: params.userId, token: params.token },
    });

    return result.count > 0;
  }

  async findActiveTimeZones(): Promise<string[]> {
    // groupBy, not findMany({ distinct }): Prisma applies `distinct`
    // in memory after fetching every row, a full-table scan repeated
    // every sweep. groupBy pushes the deduplication into SQL.
    const rows = await this.prisma.device.groupBy({
      by: ['timeZone'],
    });

    return rows.map((row) => row.timeZone);
  }

  async findDueRecipients(
    params: FindDueRecipientsParams,
  ): Promise<DueRecipient[]> {
    // Driven by the profile, not the user: the hour belongs to the
    // language, so a subscriber appears once per profile due now.
    const rows = await this.prisma.userLearningProfile.findMany({
      where: {
        // The profile's own hour, falling back to the account-wide one
        // for profiles an older client created without asking.
        OR: [
          { reminderSlot: params.slot },
          {
            reminderSlot: null,
            user: {
              notificationPreferences: {
                some: { channel: params.channel, slot: params.slot },
              },
            },
          },
        ],
        user: {
          deletedAt: null,
          devices: { some: { timeZone: params.timeZone } },
          notificationPreferences: {
            some: { channel: params.channel, enabled: true },
          },
        },
        // The ledger, not a flag, so a restart cannot lose the fact.
        notificationDeliveries: {
          none: {
            channel: params.channel,
            localDate: new Date(params.localDate),
          },
        },
      },
      select: {
        id: true,
        userId: true,
        interfaceLanguage: true,
        user: {
          select: {
            devices: {
              where: { timeZone: params.timeZone },
              select: { token: true },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      userId: row.userId,
      userLearningProfileId: row.id,
      interfaceLanguage: row.interfaceLanguage,
      tokens: row.user.devices.map((device) => device.token),
    }));
  }

  async recordDelivery(params: RecordDeliveryParams): Promise<boolean> {
    // skipDuplicates rather than catching P2002: the conflict is an
    // ordinary outcome here.
    const result = await this.prisma.notificationDelivery.createMany({
      data: {
        userId: params.userId,
        userLearningProfileId: params.userLearningProfileId,
        channel: params.channel,
        localDate: new Date(params.localDate),
      },
      skipDuplicates: true,
    });

    return result.count > 0;
  }

  async deleteDevicesByTokens(tokens: string[]): Promise<number> {
    if (tokens.length === 0) return 0;

    const result = await this.prisma.device.deleteMany({
      where: { token: { in: tokens } },
    });

    return result.count;
  }

  /**
   * Only supported channels are seeded: a row the sender cannot deliver
   * shows up in the app as a switch that does nothing.
   */
  private async ensureDefaultPreferences(userId: string): Promise<void> {
    await Promise.all(
      SUPPORTED_CHANNELS.map((channel) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_channel: {
              userId,
              channel: channel,
            },
          },
          update: {},
          create: {
            userId,
            channel: channel,
            enabled: DEFAULT_PREFERENCE_BY_CHANNEL[channel].enabled,
            slot: DEFAULT_PREFERENCE_BY_CHANNEL[channel].slot,
          },
        }),
      ),
    );
  }
}
