import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetTodayWordForUserQuery,
  GetTodayWordForUserResult,
} from '../queries/get-today-word-for-user.query';
import { TodayWordService } from '../services/today-word.service';

@QueryHandler(GetTodayWordForUserQuery)
export class GetTodayWordForUserHandler implements IQueryHandler<
  GetTodayWordForUserQuery,
  GetTodayWordForUserResult
> {
  constructor(private readonly todayWordService: TodayWordService) {}

  async execute(
    query: GetTodayWordForUserQuery,
  ): Promise<GetTodayWordForUserResult> {
    return this.todayWordService.getOrAssignTodayWord(
      query.userId,
      query.localDate,
    );
  }
}
