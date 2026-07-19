import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JoinWaitlistCommand } from '../../../application/commands/join-waitlist.command';
import { JoinWaitlistRequestDto } from '../../../application/dto/join-waitlist.request.dto';
import { ApiSuccessResponse } from '../../../../../shared/presentation/http/api-success-response';
import { GetWaitlistEntryQuery } from '../../../application/queries/get-waitlist-entry.query';
import {
  GetWaitlistCountQuery,
  GetWaitlistCountResult,
} from '../../../application/queries/get-waitlist-count.query';
import {
  GetWaitlistEntriesQuery,
  GetWaitlistEntriesResult,
} from '../../../application/queries/get-waitlist-entries.query';
import { GetWaitlistEntryQueryDto } from '../../../application/dto/get-waitlist-entry.query.dto';
import { minutes, Throttle } from '@nestjs/throttler';
import { WAITLIST } from '../../../../../shared/presentation/http/endpoints';
import { Public } from '../../../../auth/presentation/public.decorator';

@Controller(WAITLIST.BASE)
export class WaitlistController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Throttle({
    default: {
      limit: 10,
      ttl: minutes(60),
      blockDuration: minutes(60 * 5),
    },
  })
  @Post(WAITLIST.JOIN)
  @Public()
  async joinWaitlist(@Body() body: JoinWaitlistRequestDto) {
    const result = await this.commandBus.execute(
      new JoinWaitlistCommand(body.email, body.source),
    );

    return ApiSuccessResponse.of(result);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: minutes(60),
      blockDuration: minutes(60 * 5),
    },
  })
  @Public()
  @Get(WAITLIST.COUNT)
  async getWaitlistCount() {
    const result: GetWaitlistCountResult = await this.queryBus.execute(
      new GetWaitlistCountQuery(),
    );

    return ApiSuccessResponse.of(result);
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: minutes(60),
      blockDuration: minutes(60 * 5),
    },
  })
  @Get(WAITLIST.LIST)
  async getWaitlistEntries() {
    const result: GetWaitlistEntriesResult = await this.queryBus.execute(
      new GetWaitlistEntriesQuery(),
    );

    return ApiSuccessResponse.of(result);
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: minutes(20),
      blockDuration: minutes(60 * 5),
    },
  })
  @Get(WAITLIST.GET_BY_EMAIL)
  async getWaitlistEntry(@Query() { email }: GetWaitlistEntryQueryDto) {
    const result = await this.queryBus.execute(
      new GetWaitlistEntryQuery(email),
    );

    return ApiSuccessResponse.of(result);
  }
}
