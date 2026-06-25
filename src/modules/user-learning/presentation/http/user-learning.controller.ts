import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateUserLearningProfileRequestDto } from '../../application/dtos/create-user-learning-profile.request.dto';
import { CreateUserLearningProfileCommand } from '../../application/commands/create-user-learning-profile.command';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { GetActiveUserLearningProfileQuery } from '../../application/queries/get-active-user-learning-profile.query';
import { GetUserLearningProfilesQuery } from '../../application/queries/get-user-learning-profiles.query';
import { SetUserLearningProfileThemesRequestDto } from '../../application/dtos/set-user-learning-profile-themes.request.dto';
import { SetUserLearningProfileThemesCommand } from '../../application/commands/set-user-learning-profile-themes.command';
import { ActivateUserLearningProfileCommand } from '../../application/commands/activate-user-learning-profile.command';
import { USER_LEARNING } from '../../../../shared/presentation/http/endpoints';

@Controller(USER_LEARNING.BASE)
export class UserLearningController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('profiles')
  async createUserLearningProfile(
    @Body() body: CreateUserLearningProfileRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new CreateUserLearningProfileCommand(
        body.email,
        body.username,
        body.targetLanguage,
        body.interfaceLanguage,
        body.themeSlugs,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(USER_LEARNING.GET_ACTIVE_PROFILE)
  async getActiveUserLearningProfile(@Param('userId') userId: string) {
    const result = await this.queryBus.execute(
      new GetActiveUserLearningProfileQuery(userId),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(USER_LEARNING.LIST_PROFILES)
  async getUsersLearningProfiles(@Param('userId') userId: string) {
    const result = await this.queryBus.execute(
      new GetUserLearningProfilesQuery(userId),
    );

    return ApiSuccessResponse.of(result);
  }

  @Patch(USER_LEARNING.ACTIVATE_PROFILE)
  async activateUserLearningProfile(
    @Param('userId') userId: string,
    @Param('profileId') profileId: string,
  ) {
    const result = await this.commandBus.execute(
      new ActivateUserLearningProfileCommand(userId, profileId),
    );

    return ApiSuccessResponse.of(result);
  }

  @Patch(USER_LEARNING.SET_THEMES)
  async setUserLearningProfileThemes(
    @Param('profileId') profileId: string,
    @Body() body: SetUserLearningProfileThemesRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new SetUserLearningProfileThemesCommand(profileId, body.themeSlugs),
    );

    return ApiSuccessResponse.of(result);
  }
}
