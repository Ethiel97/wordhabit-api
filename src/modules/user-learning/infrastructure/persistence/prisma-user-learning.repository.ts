import {
  ActivateUserLearningProfileParams,
  CreateUserLearningProfileParams,
  CreateUserParams,
  FindUserLearningProfileParams,
  FindUserLearningProfilesParams,
  SwapReminderSlotParams,
  UpdateUserLearningProfileParams,
  UserLearningRepository,
} from '../../domain/repositories/user-learning.repository';
import { User } from '../../domain/entities/user';
import { UserLearningProfile } from '../../domain/entities/user-learning-profile';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { NotificationSlot } from '../../../notifications/domain/entities/notification';
import { Injectable } from '@nestjs/common';

const withThemes = { themes: { include: { theme: true } } } as const;

type ProfileRow = {
  id: string;
  userId: string;
  isActive: boolean;
  isMain: boolean;
  interfaceLanguage: string;
  targetLanguage: string;
  difficulty: string | null;
  reminderSlot: string | null;
  createdAt: Date;
  updatedAt: Date;
  themes: { theme: { slug: string } }[];
};

function toDomain(row: ProfileRow): UserLearningProfile {
  return {
    id: row.id,
    userId: row.userId,
    isActive: row.isActive,
    isMain: row.isMain,
    interfaceLanguage: row.interfaceLanguage as LanguageCode,
    targetLanguage: row.targetLanguage as LanguageCode,
    difficulty: (row.difficulty as WordDifficulty | null) ?? undefined,
    reminderSlot: (row.reminderSlot as NotificationSlot | null) ?? undefined,
    themeSlugs: row.themes.map((t) => t.theme.slug),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaUserLearningRepository implements UserLearningRepository {
  constructor(private readonly prisma: PrismaService) {}
  async swapReminderSlot(
    params: SwapReminderSlotParams,
  ): Promise<UserLearningProfile> {
    const { userId, profileId, reminderSlot } = params;

    const swapped = await this.prisma.$transaction(async (tx) => {
      const holder = await tx.userLearningProfile.findFirst({
        where: { userId, reminderSlot, id: { not: profileId } },
        select: { id: true },
      });

      if (!holder) {
        return tx.userLearningProfile.update({
          where: { id: profileId },
          data: { reminderSlot },
          include: withThemes,
        });
      }

      const mover = await tx.userLearningProfile.findUniqueOrThrow({
        where: { id: profileId },
        select: { reminderSlot: true },
      });

      // Through null first: `(userId, reminderSlot)` is unique, so the
      // two profiles can never hold the same slot, not even between two
      // statements of one transaction. The index is partial — `WHERE
      // reminderSlot IS NOT NULL` — which is exactly what makes this
      // detour legal, and Postgres cannot defer a partial unique index.
      await tx.userLearningProfile.update({
        where: { id: profileId },
        data: { reminderSlot: null },
      });

      await tx.userLearningProfile.update({
        where: { id: holder.id },
        data: { reminderSlot: mover.reminderSlot },
      });

      return tx.userLearningProfile.update({
        where: { id: profileId },
        data: { reminderSlot },
        include: withThemes,
      });
    });

    return toDomain(swapped);
  }

  async deleteUserLearningProfile(profileId: string): Promise<boolean> {
    const result = await this.prisma.userLearningProfile.delete({
      where: {
        id: profileId,
      },
    });
    return !!result;
  }

  async findUserLearningProfileById(
    profileId: string,
  ): Promise<UserLearningProfile | null> {
    const found = await this.prisma.userLearningProfile.findUnique({
      where: {
        id: profileId,
      },
      include: withThemes,
    });

    return found ? toDomain(found) : null;
  }

  async updateUserLearningProfile(
    params: UpdateUserLearningProfileParams,
  ): Promise<UserLearningProfile> {
    const {
      profileId,
      themeSlugs,
      interfaceLanguage,
      targetLanguage,
      difficulty,
      reminderSlot,
    } = params;

    const updated = await this.prisma.userLearningProfile.update({
      where: {
        id: profileId,
      },
      data: {
        ...(themeSlugs != null
          ? {
              themes: {
                deleteMany: {},
                create: themeSlugs.map((themeSlug) => ({
                  theme: {
                    connect: {
                      slug: themeSlug,
                    },
                  },
                })),
              },
            }
          : {}),
        ...(interfaceLanguage != null ? { interfaceLanguage } : {}),
        ...(targetLanguage != null ? { targetLanguage } : {}),
        ...(difficulty != null ? { difficulty } : {}),
        ...(reminderSlot !== undefined ? { reminderSlot } : {}),
      },
      include: withThemes,
    });

    return toDomain(updated);
  }
  activateUserLearningProfile(
    params: ActivateUserLearningProfileParams,
  ): Promise<UserLearningProfile> {
    const { userId, profileId } = params;

    return this.prisma.$transaction(async (tx) => {
      await tx.userLearningProfile.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      const activated = await tx.userLearningProfile.update({
        where: {
          id: profileId,
        },
        data: {
          isActive: true,
        },
        include: withThemes,
      });

      return toDomain(activated);
    });
  }

  async findUserLearningProfiles(
    params: FindUserLearningProfilesParams,
  ): Promise<UserLearningProfile[]> {
    const { userId } = params;
    const profiles = await this.prisma.userLearningProfile.findMany({
      where: {
        userId,
      },
      include: withThemes,
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    });

    return profiles.map(toDomain);
  }

  async createUser(params: CreateUserParams): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: params.email.trim().toLowerCase(),
        name: params.name,
      },
      omit: { password: true },
    });
  }

  async createUserLearningProfile(
    params: CreateUserLearningProfileParams,
  ): Promise<UserLearningProfile> {
    const userLearningProfile = await this.prisma.$transaction(async (tx) => {
      // Any active profile, not just the main one: a learner creating a
      // third language from their second would otherwise end up with two
      // active profiles, which the partial unique index refuses.
      await tx.userLearningProfile.updateMany({
        where: { userId: params.userId, isActive: true },
        data: { isActive: false },
      });

      return tx.userLearningProfile.create({
        data: {
          userId: params.userId,
          targetLanguage: params.targetLanguage,
          isActive: true,
          isMain: params.isMain,
          interfaceLanguage: params.interfaceLanguage,
          difficulty: params.difficulty,
          reminderSlot: params.reminderSlot,
          themes: {
            create: params.themeSlugs.map((themeSlug) => ({
              theme: {
                connect: {
                  slug: themeSlug,
                },
              },
            })),
          },
        },
        include: withThemes,
      });
    });

    return toDomain(userLearningProfile);
  }

  async findActiveUserLearningProfile(
    userId: string,
  ): Promise<UserLearningProfile | null> {
    const found = await this.prisma.userLearningProfile.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: withThemes,
    });

    return found ? toDomain(found) : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      omit: { password: true },
    });

    if (!found) {
      return null;
    }
    return found;
  }

  async findUserById(userId: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      omit: { password: true },
    });
    if (!found) {
      return null;
    }
    return found;
  }

  async findUserLearningProfile(
    params: FindUserLearningProfileParams,
  ): Promise<UserLearningProfile | null> {
    const found = await this.prisma.userLearningProfile.findFirst({
      where: {
        userId: params.userId,
        targetLanguage: params.targetLanguage,
      },
      include: withThemes,
    });

    return found ? toDomain(found) : null;
  }
}
