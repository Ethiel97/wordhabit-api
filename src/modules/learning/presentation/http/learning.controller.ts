import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  GetTodayWordForUserQuery,
  GetTodayWordForUserResult,
} from '../../application/queries/get-today-word-for-user.query';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { SetUserWordProgressCommand } from '../../application/commands/set-user-word-progress.command';
import { SetUserWordProgressRequestDto } from '../../application/dtos/set-user-word-progress-request.dto';
import { GetUserWordProgressQuery } from '../../application/queries/get-user-word-progress.query';

@Controller('learning')
export class LearningController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('users/:userId/today-word')
  async getTodayWordForUser(@Param('userId') userId: string) {
    const todayWord: GetTodayWordForUserResult = await this.queryBus.execute(
      new GetTodayWordForUserQuery(userId),
    );

    return ApiSuccessResponse.of(todayWord);
  }

  @Patch('users/:userId/words/:wordId/progress')
  async setUserWordProgressStatus(
    @Param('userId') userId: string,
    @Param('wordId') wordId: string,
    @Body() body: SetUserWordProgressRequestDto,
  ) {
    const progress = await this.commandBus.execute(
      new SetUserWordProgressCommand(userId, wordId, body.status),
    );

    return ApiSuccessResponse.of(progress);
  }

  @Get('users/:userId/words/:wordId/progress')
  async getUserWordProgressStatus(
    @Param('userId') userId: string,
    @Param('wordId') wordId: string,
  ) {
    const progress = await this.queryBus.execute(
      new GetUserWordProgressQuery(userId, wordId),
    );

    return ApiSuccessResponse.of(progress);
  }
}
