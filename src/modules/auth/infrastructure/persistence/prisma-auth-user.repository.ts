import {
  AuthUserRepository,
  CreateAuthUserParams,
} from '../../domain/repositories/auth-user.repository';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { User } from '../../../user-learning/domain/entities/user';
import { PrismaUserMapper } from './prisma-user.mapper';

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  private readonly logger = new Logger(PrismaAuthUserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

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
        username: params.username,
        password: params.password,
      },
    });
    return PrismaUserMapper.toDomain(user);
  }
}
