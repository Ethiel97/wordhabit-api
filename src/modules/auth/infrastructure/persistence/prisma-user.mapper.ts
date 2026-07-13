import { User } from '../../../user-learning/domain/entities/user';

import type { UserModel as PrismaUser } from 'generated/prisma/models';

export class PrismaUserMapper {
  static toDomain(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      username: prismaUser.username,
      password: prismaUser.password,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  static toPrisma(domainUser: User): PrismaUser {
    return {
      id: domainUser.id,
      email: domainUser.email,
      username: domainUser.username,
      password: domainUser.password,
      createdAt: domainUser.createdAt,
      updatedAt: domainUser.updatedAt,
    };
  }
}
