import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateUserLearningProfileRequestDto } from '../../application/dtos/create-user-learning-profile.request.dto';
import { CreateUserLearningProfileCommand } from '../../application/commands/create-user-learning-profile.command';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { ONBOARDING } from '../../../../shared/presentation/http/endpoints';
import { CurrentUser } from '../../../auth/presentation/current-user.decoraor';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';

@Controller(ONBOARDING.BASE)
export class OnboardingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(ONBOARDING.COMPLETE)
  async completeOnboarding(
    @CurrentUser() user: AuthenticatedUser,

    @Body() body: CreateUserLearningProfileRequestDto,
  ) {
    const result = await this.commandBus.execute(
      // The command takes interfaceLanguage *before* targetLanguage.
      // These two were passed the other way round, which silently
      // reversed the pair — invisible while both were EN, and wrong the
      // moment setup let a user learn French.
      new CreateUserLearningProfileCommand(
        user.email,
        user.name,
        body.interfaceLanguage,
        body.targetLanguage,
        body.themeSlugs,
        body.difficulty,
      ),
    );

    return ApiSuccessResponse.of(result);
  }
}
