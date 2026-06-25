import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateUserLearningProfileRequestDto } from '../../application/dtos/create-user-learning-profile.request.dto';
import { CreateUserLearningProfileCommand } from '../../application/commands/create-user-learning-profile.command';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { ONBOARDING } from '../../../../shared/presentation/http/endpoints';

@Controller(ONBOARDING.BASE)
export class OnboardingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(ONBOARDING.COMPLETE)
  async completeOnboarding(@Body() body: CreateUserLearningProfileRequestDto) {
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
}
