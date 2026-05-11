import type { UserWordProgressStatus as PrismaUserWordProgressStatus } from 'generated/prisma/enums';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';

export class PrismaLearningMapper {
  static toDomainUserWordProgressStatus(
    value: PrismaUserWordProgressStatus,
  ): UserWordProgressStatus {
    switch (value) {
      case 'NEW':
        return UserWordProgressStatus.NEW;
      case 'LEARNING':
        return UserWordProgressStatus.LEARNING;
      case 'SKIPPED':
        return UserWordProgressStatus.SKIPPED;
      case 'MASTERED':
        return UserWordProgressStatus.MASTERED;

      default:
        return UserWordProgressStatus.NEW;
    }
  }

  static toPrismaUserWordProgressStatus(
    value: UserWordProgressStatus,
  ): PrismaUserWordProgressStatus {
    switch (value) {
      case UserWordProgressStatus.NEW:
        return 'NEW';
      case UserWordProgressStatus.LEARNING:
        return 'LEARNING';
      case UserWordProgressStatus.SKIPPED:
        return 'SKIPPED';
      case UserWordProgressStatus.MASTERED:
        return 'MASTERED';
      default:
        return 'NEW';
    }
  }
}
