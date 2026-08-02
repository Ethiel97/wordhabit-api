import { Query } from '@nestjs/cqrs';
import { NotificationPreferencesResult } from '../../domain/entities/notification';

export class GetNotificationPreferencesQuery extends Query<GetNotificationPreferencesResult> {
  constructor(public readonly userId: string) {
    super();
  }
}

export type GetNotificationPreferencesResult = NotificationPreferencesResult;
