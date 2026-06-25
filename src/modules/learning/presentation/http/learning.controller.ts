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
import { GetRandomWordForLandingQuery } from '../../application/queries/get-random-word-for-landing.query';
import {
  GetReviewQueueQuery,
  GetReviewQueueResult,
} from '../../application/queries/get-review-queue.query';
import { SubmitWordReviewCommand } from '../../application/commands/submit-word-review.command';
import { SubmitWordReviewRequestDto } from '../../application/dtos/submit-word-review-request.dto';
import { LEARNING } from '../../../../shared/presentation/http/endpoints';

@Controller(LEARNING.BASE)
export class LearningController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get(LEARNING.RANDOM_WORD)
  async getRandomWordForLanding() {
    const randomWord = await this.queryBus.execute(
      new GetRandomWordForLandingQuery(),
    );

    return ApiSuccessResponse.of(randomWord);
  }

  @Get(LEARNING.TODAY_WORD)
  async getTodayWordForUser(@Param('userId') userId: string) {
    const todayWord: GetTodayWordForUserResult = await this.queryBus.execute(
      new GetTodayWordForUserQuery(userId),
    );

    return ApiSuccessResponse.of(todayWord);
  }

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

  @Get(LEARNING.WORD_PROGRESS)
  async getUserWordProgressStatus(
    @Param('userId') userId: string,
    @Param('wordId') wordId: string,
  ) {
    const progress = await this.queryBus.execute(
      new GetUserWordProgressQuery(userId, wordId),
    );

    return ApiSuccessResponse.of(progress);
  }

  @Get(LEARNING.REVIEW_QUEUE)
  async getReviewQueue(@Param('userId') userId: string) {
    const result: GetReviewQueueResult = await this.queryBus.execute(
      new GetReviewQueueQuery(userId),
    );

    return ApiSuccessResponse.of(result);
  }

  @Patch(LEARNING.WORD_REVIEW)
  async submitWordReview(
    @Param('userId') userId: string,
    @Param('wordId') wordId: string,
    @Body() body: SubmitWordReviewRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new SubmitWordReviewCommand(userId, wordId, body.correct),
    );

    return ApiSuccessResponse.of(result);
  }
}
