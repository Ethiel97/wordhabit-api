import type { UserWordProgressStatus as PrismaUserWordProgressStatus } from 'generated/prisma/enums';
import { UserWordProgressStatus } from '../../domain/entities/user-word-progress';
import { BadgeCode as PrismaBadgeCode } from '../../../../../generated/prisma/enums';
import { BadgeCode } from '../../domain/entities/badge';

export class PrismaLearningMapper {
  static toDomainBadgeCode(value: PrismaBadgeCode): BadgeCode {
    return BadgeCode[value];
  }

  static toPrismaBadgeCode(value: BadgeCode): PrismaBadgeCode {
    return PrismaBadgeCode[value];
  }

  static toDomainUserWordProgressStatus(
    value: PrismaUserWordProgressStatus,
  ): UserWordProgressStatus {
    switch (value) {
      case 'NEW':
        return UserWordProgressStatus.NEW;
      case 'SEEN':
        return UserWordProgressStatus.SEEN;
      case 'LEARNING':
        return UserWordProgressStatus.LEARNING;
      case 'SKIPPED':
        return UserWordProgressStatus.SKIPPED;
      case 'MASTERED':
        return UserWordProgressStatus.MASTERED;
    }
  }

  static toPrismaUserWordProgressStatus(
    value: UserWordProgressStatus,
  ): PrismaUserWordProgressStatus {
    switch (value) {
      case UserWordProgressStatus.NEW:
        return 'NEW';
      case UserWordProgressStatus.SEEN:
        return 'SEEN';
      case UserWordProgressStatus.LEARNING:
        return 'LEARNING';
      case UserWordProgressStatus.SKIPPED:
        return 'SKIPPED';
      case UserWordProgressStatus.MASTERED:
        return 'MASTERED';
    }
  }
}
