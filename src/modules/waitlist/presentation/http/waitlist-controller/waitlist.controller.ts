import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JoinWaitlistCommand } from '../../../application/commands/join-waitlist.command';
import { JoinWaitlistRequestDto } from '../../../application/dto/join-waitlist.request.dto';
import { ApiSuccessResponse } from '../api-success-response';
import { GetWaitlistEntryQuery } from '../../../application/queries/get-waitlist-entry.query';
import { GetWaitlistEntriesQuery } from '../../../application/queries/get-waitlist-entries.query';
import { GetWaitlistEntryQueryDto } from '../../../application/dto/get-waitlist-entry.query.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async joinWaitlist(@Body() body: JoinWaitlistRequestDto) {
    const result = await this.commandBus.execute(
      new JoinWaitlistCommand(body.email, body.source),
    );

    return ApiSuccessResponse.of(result);
  }

  @Get()
  async getWaitlistEntries() {
    const result = await this.queryBus.execute(new GetWaitlistEntriesQuery());

    return ApiSuccessResponse.of(result);
  }

  @Get('by-email')
  async getWaitlistEntry(@Query() { email }: GetWaitlistEntryQueryDto) {
    const result = await this.queryBus.execute(
      new GetWaitlistEntryQuery(email),
    );

    return ApiSuccessResponse.of(result);
  }
}
