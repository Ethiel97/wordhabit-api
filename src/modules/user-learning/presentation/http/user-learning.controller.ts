import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
} from '@nestjs/common';
import { CreateUserLearningProfileRequestDto } from '../../application/dtos/create-user-learning-profile.request.dto';
import { CreateUserLearningProfileCommand } from '../../application/commands/create-user-learning-profile.command';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { GetActiveUserLearningProfileQuery } from '../../application/queries/get-active-user-learning-profile.query';
import { GetUserLearningProfilesQuery } from '../../application/queries/get-user-learning-profiles.query';
import { UpdateUserLearningProfileDto } from '../../application/dtos/update-user-learning-profile.dto';
import { UpdateUserLearningProfileCommand } from '../../application/commands/update-user-learning-profile.command';
import { ActivateUserLearningProfileCommand } from '../../application/commands/activate-user-learning-profile.command';
import { USER_LEARNING } from '../../../../shared/presentation/http/endpoints';
import { CurrentUser } from '../../../auth/presentation/current-user.decoraor';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';
import { DeleteUserLearningProfileCommand } from '../../application/commands/delete-user-learning-profile.command';

@Controller(USER_LEARNING.BASE)
export class UserLearningController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(USER_LEARNING.CREATE_PROFILE)
  async createUserLearningProfile(
    @CurrentUser()
    user: AuthenticatedUser,
    @Body() body: CreateUserLearningProfileRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new CreateUserLearningProfileCommand(
        user.email,
        user.name,
        body.interfaceLanguage,
        body.targetLanguage,
        body.themeSlugs,
        body.difficulty,
        body.reminderSlot,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(USER_LEARNING.GET_ACTIVE_PROFILE)
  async getActiveUserLearningProfile(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.queryBus.execute(
      new GetActiveUserLearningProfileQuery(user.id),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get(USER_LEARNING.LIST_PROFILES)
  async getUsersLearningProfiles(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.queryBus.execute(
      new GetUserLearningProfilesQuery(user.id),
    );

    return ApiSuccessResponse.of(result);
  }

  @Patch(USER_LEARNING.ACTIVATE_PROFILE)
  async activateUserLearningProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
  ) {
    const result = await this.commandBus.execute(
      new ActivateUserLearningProfileCommand(user.id, profileId),
    );

    return ApiSuccessResponse.of(result);
  }

  @Patch(USER_LEARNING.UPDATE_PROFILE)
  async updateUserLearningProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
    @Body() body: UpdateUserLearningProfileDto,
  ) {
    const result = await this.commandBus.execute(
      new UpdateUserLearningProfileCommand(
        user.id,
        profileId,
        body.themeSlugs,
        body.interfaceLanguage,
        body.targetLanguage,
        body.difficulty,
        body.reminderSlot,
      ),
    );

    return ApiSuccessResponse.of(result);
  }

  @Delete(USER_LEARNING.DELETE_PROFILE)
  async deleteUserLearningProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId') profileId: string,
  ) {
    const result = await this.commandBus.execute(
      new DeleteUserLearningProfileCommand(user.id, profileId),
    );

    return ApiSuccessResponse.of(result);
  }
}
