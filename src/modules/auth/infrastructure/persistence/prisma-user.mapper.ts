import { User } from '../../domain/entities/user';

import type { UserModel as PrismaUser } from 'generated/prisma/models';

export class PrismaUserMapper {
  static toDomain(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      password: prismaUser.password,
      deletedAt: prismaUser.deletedAt,
      emailVerifiedAt: prismaUser.emailVerifiedAt,
      passwordVersion: prismaUser.passwordVersion,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
