import {
  CreateUserLearningProfileParams,
  CreateUserParams,
  FindUserLearningProfileParams,
  UserLearningRepository,
} from '../../domain/repositories/user-learning.repository';
import { User } from '../../domain/entities/user';
import { UserLearningProfile } from '../../domain/entities/user-learning-profile';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { LanguageCode } from '../../../vocabulary/domain/entities/language-code';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaUserLearningRepository implements UserLearningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(params: CreateUserParams): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: params.email.trim().toLowerCase(),
        username: params.username,
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
        interfaceLanguage: params.interfaceLanguage,
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
      themeSlugs: userLearningProfile.themes.map((t) => t.theme.slug),
      createdAt: userLearningProfile.createdAt,
      updatedAt: userLearningProfile.updatedAt,
    };
  }

  async findActiveUserLearningProfile(
    userId: string,
  ): Promise<UserLearningProfile | null> {
    const found = await this.prisma.userLearningProfile.findUnique({
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
      themeSlugs: found.themes.map((t) => t.theme.slug),
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }
}
