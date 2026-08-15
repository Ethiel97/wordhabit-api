import {
  AuthUserRepository,
  CreateAuthUserParams,
  LinkIdentityParams,
  UpdateAuthUserParams,
} from '../../domain/repositories/auth-user.repository';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { User } from '../../domain/entities/user';
import { PrismaUserMapper } from './prisma-user.mapper';
import { AccountDeletionReason } from '../../domain/entities/account-deletion-reason';
import { AuthProvider } from '../../domain/entities/auth-provider';

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

  async changeEmail(userId: string, email: string): Promise<User> {
    // `emailVerifiedAt` is left alone: the incoming address just
    // answered a code, so clearing the flag would lock the user out for
    // having verified something.
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { email: normalizeEmail(email) },
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
      // Cleared with the deletion it belonged to, or a restored account
      // still looks like it is on its way out.
      data: { deletedAt: null, deletionReason: null },
    });

    return PrismaUserMapper.toDomain(restored);
  }

  async findPurgeable(deletedBefore: Date, limit = 100): Promise<User[]> {
    const purgeable = await this.prisma.user.findMany({
      // Compared bare so the index is a range scan: `deletedAt + 30
      // days < now()` wraps the column and forces a full scan.
      where: { deletedAt: { lt: deletedBefore } },
      // Bounded: a backlog drains over several scheduled passes.
      orderBy: { deletedAt: 'asc' },
      take: limit,
    });

    return purgeable.map((user) => PrismaUserMapper.toDomain(user));
  }

  async purge(userId: string): Promise<void> {
    // One statement erases everything: every relation on `User` is
    // declared `onDelete: Cascade`.
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
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
        email: normalizeEmail(params.email),
        name: params.name,
        password: params.password,
        emailVerifiedAt: params.emailVerified ? new Date() : null,
      },
    });
    return PrismaUserMapper.toDomain(user);
  }

  async findByIdentity(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    const identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: provider,
          providerUserId,
        },
      },
      include: { user: true },
    });

    return identity ? PrismaUserMapper.toDomain(identity.user) : null;
  }

  async linkIdentity(params: LinkIdentityParams): Promise<void> {
    // Signing in from a second device replays the same pair, so the
    // insert has to be a no-op rather than a unique-constraint failure.
    await this.prisma.userIdentity.createMany({
      data: [
        {
          userId: params.userId,
          provider: params.provider,
          providerUserId: params.providerUserId,
        },
      ],
      skipDuplicates: true,
    });
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

/**
 * Emails are matched and stored lowercase. Postgres compares strings
 * case-sensitively, so `Clau.beke@` and `clau.beke@` were two accounts:
 * registration stored the address as typed while the social verifier
 * already lowercased it, and login lowercases too — which left the
 * password account unreachable.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
