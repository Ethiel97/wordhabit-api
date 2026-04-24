import { CommandBus } from '@nestjs/cqrs';
import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserLearningProfileRequestDto } from '../../application/dtos/create-user-learning-profile.request.dto';
import { CreateUserLearningProfileCommand } from '../../application/commands/CreateUserLearningProfileCommand';
import { ApiSuccessResponse } from '../../../waitlist/presentation/http/api-success-response';

@Controller('user-learning')
export class UserLearningController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
