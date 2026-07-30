import { User } from '../../../user-learning/domain/entities/user';

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
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  static toPrisma(domainUser: User): PrismaUser {
    return {
      id: domainUser.id,
      email: domainUser.email,
      name: domainUser.name,
      password: domainUser.password,
      emailVerifiedAt: domainUser.emailVerifiedAt,
      createdAt: domainUser.createdAt,
      updatedAt: domainUser.updatedAt,
      deletedAt: domainUser.deletedAt,
      deletionReason: null,
    };
  }
}
