import {
  AuthUserRepository,
  CreateAuthUserParams,
  UpdateAuthUserParams,
} from '../../domain/repositories/auth-user.repository';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { User } from '../../../user-learning/domain/entities/user';
import { PrismaUserMapper } from './prisma-user.mapper';
import { AccountDeletionReason } from '../../domain/entities/account-deletion-reason';

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  private readonly logger = new Logger(PrismaAuthUserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async changePassword(userId: string, passwordHash: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },

      data: { password: passwordHash, passwordVersion: { increment: 1 } },
    });

    return PrismaUserMapper.toDomain(user);
  }

  async softDelete(params: {
    userId: string;
    reason?: AccountDeletionReason;
  }): Promise<User> {
    const { userId, reason } = params;
    const deleted = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        deletionReason: reason ?? null,
      },
    });

    return PrismaUserMapper.toDomain(deleted);
  }

  async restore(userId: string): Promise<User> {
    const restored = await this.prisma.user.update({
      where: { id: userId },
      // The reason goes with the deletion it belonged to. Keeping it
      // would make a restored account look like it is still on its way
      // out, and the next deletion carries its own answer.
      data: { deletedAt: null, deletionReason: null },
    });

    return PrismaUserMapper.toDomain(restored);
  }

  async findPurgeable(deletedBefore: Date, limit = 100): Promise<User[]> {
    const purgeable = await this.prisma.user.findMany({
      // The column is compared bare so the index on `deletedAt` is a
      // range scan. Writing `deletedAt + 30 days < now()` instead would
      // wrap the column in an expression and force a full table scan.
      where: { deletedAt: { lt: deletedBefore } },
      // Bounded on purpose: the sweep runs on a schedule, so a backlog
      // drains over several passes instead of loading every due
      // account into memory at once.
      orderBy: { deletedAt: 'asc' },
      take: limit,
    });

    return purgeable.map((user) => PrismaUserMapper.toDomain(user));
  }

  async purge(userId: string): Promise<void> {
    // One statement erases everything: every relation on `User` is
    // declared `onDelete: Cascade`, from learning profiles down to
    // review events and verification codes.
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return PrismaUserMapper.toDomain(user);
  }

  async findById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`User with ID ${userId} not found.`);
      return null;
    }

    return PrismaUserMapper.toDomain(user);
  }

  async create(params: CreateAuthUserParams): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        password: params.password,
      },
    });
    return PrismaUserMapper.toDomain(user);
  }

  async update(userId: string, params: UpdateAuthUserParams): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(params.name !== undefined && { name: params.name }),
      },
    });
    return PrismaUserMapper.toDomain(user);
  }

  async markEmailVerified(userId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    return PrismaUserMapper.toDomain(user);
  }
}
