import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import {
  GetLearningDashboardQuery,
  GetLearningDashboardResult,
} from '../../application/queries/get-learning-dashboard.query';
import {
  GetUserWordLibraryQuery,
  GetUserWordLibraryResult,
} from '../../application/queries/get-user-word-library.query';
import { GetUserWordLibraryRequestDto } from '../../application/dtos/get-user-word-library-request.dto';
import {
  GetUserFavoriteWordsQuery,
  GetUserFavoriteWordsResult,
} from '../../application/queries/get-user-favorite-words.query';
import { AddUserFavoriteWordCommand } from '../../application/commands/add-user-favorite-word.command';
import { RemoveUserFavoriteWordCommand } from '../../application/commands/remove-user-favorite-word.command';
import { CurrentUser } from '../../../auth/presentation/current-user.decoraor';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';
import { Public } from '../../../auth/presentation/public.decorator';

@Controller(LEARNING.BASE)
export class LearningController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Public()
  @Get(LEARNING.RANDOM_WORD)
  async getRandomWordForLanding() {
    const randomWord = await this.queryBus.execute(
      new GetRandomWordForLandingQuery(),
    );

    return ApiSuccessResponse.of(randomWord);
  }

  @Get(LEARNING.TODAY_WORD)
  async getTodayWordForUser(@CurrentUser() user: AuthenticatedUser) {
    const todayWord: GetTodayWordForUserResult = await this.queryBus.execute(
      new GetTodayWordForUserQuery(user.id),
    );

    return ApiSuccessResponse.of(todayWord);
  }

  @Patch(LEARNING.WORD_PROGRESS)
  async setUserWordProgressStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
    @Body() body: SetUserWordProgressRequestDto,
  ) {
    const progress = await this.commandBus.execute(
      new SetUserWordProgressCommand(user.id, wordId, body.status),
    );

    return ApiSuccessResponse.of(progress);
  }

  @Get(LEARNING.WORD_PROGRESS)
  async getUserWordProgressStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
  ) {
    const progress = await this.queryBus.execute(
      new GetUserWordProgressQuery(user.id, wordId),
    );

    return ApiSuccessResponse.of(progress);
  }

  @Get(LEARNING.REVIEW_QUEUE)
  async getReviewQueue(@CurrentUser() user: AuthenticatedUser) {
    const result: GetReviewQueueResult = await this.queryBus.execute(
      new GetReviewQueueQuery(user.id),
    );

    return ApiSuccessResponse.of(result);
  }

  @Patch(LEARNING.WORD_REVIEW)
  async submitWordReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
    @Body() body: SubmitWordReviewRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new SubmitWordReviewCommand(user.id, wordId, body.correct),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.DASHBOARD)
  async getLearningDashboard(@CurrentUser() user: AuthenticatedUser) {
    const result: GetLearningDashboardResult = await this.queryBus.execute(
      new GetLearningDashboardQuery(user.id),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.LIBRARY)
  async getUserWordLibrary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: GetUserWordLibraryRequestDto,
  ) {
    const result: GetUserWordLibraryResult = await this.queryBus.execute(
      new GetUserWordLibraryQuery(
        user.id,
        request.status,
        request.search,
        request.limit,
        request.cursor,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.FAVORITE_WORDS)
  async getUserFavoriteWords(@CurrentUser() user: AuthenticatedUser) {
    const result: GetUserFavoriteWordsResult = await this.queryBus.execute(
      new GetUserFavoriteWordsQuery(user.id),
    );

    return ApiSuccessResponse.of(result);
  }

  @Post(LEARNING.FAVORITE_WORD)
  async addUserFavoriteWord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
  ) {
    const result = await this.commandBus.execute(
      new AddUserFavoriteWordCommand(user.id, wordId),
    );

    return ApiSuccessResponse.of(result);
  }

  @Delete(LEARNING.FAVORITE_WORD)
  async removeUserFavoriteWord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
  ) {
    const result = await this.commandBus.execute(
      new RemoveUserFavoriteWordCommand(user.id, wordId),
    );

    return ApiSuccessResponse.of(result);
  }
}
