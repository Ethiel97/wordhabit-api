import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetTodayWordForUserQuery,
  GetTodayWordForUserResult,
} from '../../application/queries/get-today-word-for-user.query';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';

@Controller('learning')
export class LearningController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('users/:userId/today-word')
  async getTodayWordForUser(@Param('userId') userId: string) {
    const todayWord: GetTodayWordForUserResult = await this.queryBus.execute(
      new GetTodayWordForUserQuery(userId),
    );

    return ApiSuccessResponse.of(todayWord);
  }
}
