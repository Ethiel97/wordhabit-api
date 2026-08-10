import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  SubscriptionState,
  SubscriptionTier,
} from '../../domain/entities/subscription';
import { SubscriptionRepository } from '../../domain/repositories/subscription.repository';

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async applyState(params: {
    userId: string;
    state: SubscriptionState;
  }): Promise<boolean> {
    // updateMany rather than update: a webhook for a deleted account is
    // an ordinary race, not an exception to throw and retry forever.
    const { count } = await this.prisma.user.updateMany({
      where: { id: params.userId },
      data: {
        subscriptionTier: params.state.tier,
        subscriptionExpiresAt: params.state.expiresAt,
        subscriptionStore: params.state.store,
      },
    });
    return count > 0;
  }

  async findState(userId: string): Promise<SubscriptionState | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        subscriptionStore: true,
      },
    });
    if (!user) return null;

    return {
      tier: user.subscriptionTier as SubscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      store: user.subscriptionStore,
    };
  }
}
