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
import { GetRandomWordQuery } from '../../application/queries/get-random-word.query';
import {
  GetReviewQueueQuery,
  GetReviewQueueResult,
} from '../../application/queries/get-review-queue.query';
import { RescheduleWordReviewCommand } from '../../application/commands/reschedule-word-review.command';
import { RescheduleWordReviewRequestDto } from '../../application/dtos/reschedule-word-review-request.dto';
import { SubmitWordReviewCommand } from '../../application/commands/submit-word-review.command';
import { SubmitQuizResultCommand } from '../../application/commands/submit-quiz-result.command';
import { GetWordQuizQuery } from '../../application/queries/get-word-quiz.query';
import {
  GetProfilesDailyStatesQuery,
  GetProfilesDailyStatesResult,
} from '../../application/queries/get-profiles-daily-states.query';
import { SubmitQuizResultRequestDto } from '../../application/dtos/submit-quiz-result-request.dto';
import { GetWordQuizRequestDto } from '../../application/dtos/get-word-quiz-request.dto';
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
  GetUserActivityQuery,
  GetUserActivityResult,
} from '../../application/queries/get-user-activity.query';
import { GetUserActivityRequestDto } from '../../application/dtos/get-user-activity-request.dto';
import { GetLearnerXpRequestDto } from '../../application/dtos/get-learner-xp-request.dto';
import {
  GetLearnerXpQuery,
  GetLearnerXpResult,
} from '../../application/queries/get-learner-xp.query';
import {
  GetUserActivityDetailQuery,
  GetUserActivityDetailResult,
} from '../../application/queries/get-user-activity-detail.query';
import { GetUserActivityDetailRequestDto } from '../../application/dtos/get-user-activity-detail-request.dto';
import {
  GetUserFavoriteWordsQuery,
  GetUserFavoriteWordsResult,
} from '../../application/queries/get-user-favorite-words.query';
import { AddUserFavoriteWordCommand } from '../../application/commands/add-user-favorite-word.command';
import { RemoveUserFavoriteWordCommand } from '../../application/commands/remove-user-favorite-word.command';
import { CurrentUser } from '../../../auth/presentation/current-user.decoraor';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';
import { Public } from '../../../auth/presentation/public.decorator';
import { GetRandomWordDto } from '../../application/dtos/get-random-word.dto';
import { LocalDateQueryDto } from '../../application/dtos/local-date.query.dto';
import {
  GetUserBadgesQuery,
  GetUserBadgesResult,
} from '../../application/queries/get-user-badges.query';

@Controller(LEARNING.BASE)
export class LearningController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Public()
  @Get(LEARNING.RANDOM_WORD)
  async getRandomWord(@Query() query: GetRandomWordDto) {
    const randomWord = await this.queryBus.execute(
      new GetRandomWordQuery(
        query.languageCode,
        query.difficulty,
        query.themes,
      ),
    );

    return ApiSuccessResponse.of(randomWord);
  }

  @Get(LEARNING.PROFILES_DAILY_STATES)
  async getProfilesDailyStates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocalDateQueryDto,
  ) {
    const states: GetProfilesDailyStatesResult = await this.queryBus.execute(
      new GetProfilesDailyStatesQuery(user.id, query.localDate),
    );

    return ApiSuccessResponse.of(states);
  }

  @Get(LEARNING.TODAY_WORD)
  async getTodayWordForUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocalDateQueryDto,
  ) {
    const todayWord: GetTodayWordForUserResult = await this.queryBus.execute(
      new GetTodayWordForUserQuery(user.id, query.localDate),
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
      new SetUserWordProgressCommand(
        user.id,
        wordId,
        body.status,
        body.localDate,
      ),
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
  async getReviewQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocalDateQueryDto,
  ) {
    const result: GetReviewQueueResult = await this.queryBus.execute(
      new GetReviewQueueQuery(user.id, query.localDate),
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
      new SubmitWordReviewCommand(
        user.id,
        wordId,
        body.correct,
        body.localDate,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.WORD_QUIZ)
  async getWordQuiz(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
    @Query() query: GetWordQuizRequestDto,
  ) {
    const quiz = await this.queryBus.execute(
      new GetWordQuizQuery(user.id, wordId, query.mode),
    );
    return ApiSuccessResponse.of(quiz);
  }

  @Post(LEARNING.QUIZ_RESULTS)
  async submitQuizResult(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SubmitQuizResultRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new SubmitQuizResultCommand(
        user.id,
        body.wordId,
        body.mode,
        body.correctCount,
        body.questionCount,
        body.localDate,
      ),
    );
    return ApiSuccessResponse.of(result);
  }

  @Patch(LEARNING.WORD_SCHEDULE)
  async rescheduleWordReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('wordId') wordId: string,
    @Body() body: RescheduleWordReviewRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new RescheduleWordReviewCommand(
        user.id,
        wordId,
        body.known,
        body.localDate,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.DASHBOARD)
  async getLearningDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocalDateQueryDto,
  ) {
    const result: GetLearningDashboardResult = await this.queryBus.execute(
      new GetLearningDashboardQuery(user.id, query.localDate),
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
        request.savedOnly,
        request.limit,
        request.cursor,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.ACTIVITY_DETAIL)
  async getUserActivityDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: GetUserActivityDetailRequestDto,
  ) {
    const result: GetUserActivityDetailResult = await this.queryBus.execute(
      new GetUserActivityDetailQuery(
        user.id,
        request.from,
        request.to,
        request.limit,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.ACTIVITY)
  async getUserActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: GetUserActivityRequestDto,
  ) {
    const result: GetUserActivityResult = await this.queryBus.execute(
      new GetUserActivityQuery(user.id, request.to, request.days),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(LEARNING.LEARNER_XP)
  async getLearnerXp(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: GetLearnerXpRequestDto,
  ) {
    const result: GetLearnerXpResult = await this.queryBus.execute(
      new GetLearnerXpQuery(user.id, request.to),
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

  @Get(LEARNING.BADGES)
  async getUserBadges(@CurrentUser() user: AuthenticatedUser) {
    const result: GetUserBadgesResult = await this.queryBus.execute(
      new GetUserBadgesQuery(user.id),
    );

    return ApiSuccessResponse.of(result);
  }
}
