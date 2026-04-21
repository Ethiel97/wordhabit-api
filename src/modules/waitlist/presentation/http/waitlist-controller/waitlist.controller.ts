import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JoinWaitlistCommand } from '../../../application/commands/join-waitlist.command';
import { JoinWaitlistRequestDto } from '../../../application/dto/join-waitlist.request.dto';
import { ApiSuccessResponse } from '../api-success-response';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async joinWaitlist(@Body() body: JoinWaitlistRequestDto) {
    const result = await this.commandBus.execute(
      new JoinWaitlistCommand(body.email, body.source),
    );

    return ApiSuccessResponse.of(result);
  }
}
