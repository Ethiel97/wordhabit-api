import {
  ActivateUserLearningProfileParams,
  CreateUserLearningProfileParams,
  CreateUserParams,
  FindUserLearningProfileParams,
  FindUserLearningProfilesParams,
  UpdateUserLearningProfileParams,
  UserLearningRepository,
} from '../../domain/repositories/user-learning.repository';
import { User } from '../../domain/entities/user';
import { UserLearningProfile } from '../../domain/entities/user-learning-profile';
import { WordDifficulty } from '../../../vocabulary/domain/entities/word-difficulty';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaUserLearningRepository implements UserLearningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserLearningProfileById(
    profileId: string,
  ): Promise<UserLearningProfile | null> {
    const found = await this.prisma.userLearningProfile.findUnique({
      where: {
        id: profileId,
      },
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    if (!found) {
      return null;
    }
    return {
      id: found.id,
      userId: found.userId,
      isActive: found.isActive,
      interfaceLanguage: found.interfaceLanguage as LanguageCode,
      targetLanguage: found.targetLanguage as LanguageCode,
      difficulty: (found.difficulty as WordDifficulty | null) ?? undefined,
      themeSlugs: found.themes.map((t) => t.theme.slug),
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
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
      },
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      isActive: updated.isActive,
      interfaceLanguage: updated.interfaceLanguage as LanguageCode,
      targetLanguage: updated.targetLanguage as LanguageCode,
      difficulty: (updated.difficulty as WordDifficulty | null) ?? undefined,
      themeSlugs: updated.themes.map((t) => t.theme.slug),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
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
        include: {
          themes: {
            include: {
              theme: true,
            },
          },
        },
      });

      return {
        id: activated.id,
        userId: activated.userId,
        isActive: activated.isActive,
        interfaceLanguage: activated.interfaceLanguage as LanguageCode,
        targetLanguage: activated.targetLanguage as LanguageCode,
        difficulty:
          (activated.difficulty as WordDifficulty | null) ?? undefined,
        themeSlugs: activated.themes.map((t) => t.theme.slug),
        createdAt: activated.createdAt,
        updatedAt: activated.updatedAt,
      };
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
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      isActive: profile.isActive,
      interfaceLanguage: profile.interfaceLanguage as LanguageCode,
      targetLanguage: profile.targetLanguage as LanguageCode,
      difficulty: (profile.difficulty as WordDifficulty | null) ?? undefined,
      themeSlugs: profile.themes.map((t) => t.theme.slug),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }));
  }

  async createUser(params: CreateUserParams): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: params.email.trim().toLowerCase(),
        name: params.name,
      },
    });
  }

  async createUserLearningProfile(
    params: CreateUserLearningProfileParams,
  ): Promise<UserLearningProfile> {
    const userLearningProfile = await this.prisma.userLearningProfile.create({
      data: {
        userId: params.userId,
        targetLanguage: params.targetLanguage,
        isActive: true,
        interfaceLanguage: params.interfaceLanguage,
        difficulty: params.difficulty,
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
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });
    return {
      id: userLearningProfile.id,
      userId: userLearningProfile.userId,
      isActive: userLearningProfile.isActive,
      interfaceLanguage: userLearningProfile.interfaceLanguage as LanguageCode,
      targetLanguage: userLearningProfile.targetLanguage as LanguageCode,
      difficulty:
        (userLearningProfile.difficulty as WordDifficulty | null) ?? undefined,
      themeSlugs: userLearningProfile.themes.map((t) => t.theme.slug),
      createdAt: userLearningProfile.createdAt,
      updatedAt: userLearningProfile.updatedAt,
    };
  }

  async findActiveUserLearningProfile(
    userId: string,
  ): Promise<UserLearningProfile | null> {
    const found = await this.prisma.userLearningProfile.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });
    if (!found) {
      return null;
    }
    return {
      id: found.id,
      userId: found.userId,
      isActive: found.isActive,
      interfaceLanguage: found.interfaceLanguage as LanguageCode,
      targetLanguage: found.targetLanguage as LanguageCode,
      difficulty: (found.difficulty as WordDifficulty | null) ?? undefined,
      themeSlugs: found.themes.map((t) => t.theme.slug),
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
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
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    if (!found) {
      return null;
    }

    return {
      id: found.id,
      userId: found.userId,
      isActive: found.isActive,
      interfaceLanguage: found.interfaceLanguage as LanguageCode,
      targetLanguage: found.targetLanguage as LanguageCode,
      difficulty: (found.difficulty as WordDifficulty | null) ?? undefined,
      themeSlugs: found.themes.map((t) => t.theme.slug),
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }
}
