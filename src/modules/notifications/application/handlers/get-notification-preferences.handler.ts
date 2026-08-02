import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetNotificationPreferencesQuery,
  GetNotificationPreferencesResult,
} from '../queries/get-notification-preferences.query';
import { Inject } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../domain/repositories/notification.repository';

@QueryHandler(GetNotificationPreferencesQuery)
export class GetNotificationPreferencesHandler implements IQueryHandler<
  GetNotificationPreferencesQuery,
  GetNotificationPreferencesResult
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
  ) {}

  async execute(
    query: GetNotificationPreferencesQuery,
  ): Promise<GetNotificationPreferencesResult> {
    const { userId } = query;

    return await this.repository.findPreferencesByUserId(userId);
  }
}
