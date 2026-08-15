import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SUBSCRIPTION } from '../../../../shared/presentation/http/endpoints/subscription.endpoints';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { Public } from '../../../auth/presentation/public.decorator';
import { CurrentUser } from '../../../auth/presentation/current-user.decoraor';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';
import { RevenueCatAuthGuard } from '../../infrastructure/webhook/revenue-cat-auth.guard';
import { ApplySubscriptionEventCommand } from '../../application/commands/apply-subscription-event.command';
import { RevenueCatWebhookRequestDto } from '../../application/dtos/revenue-cat-webhook-request.dto';
import { SubscriptionService } from '../../application/services/subscription.service';

@Controller(SUBSCRIPTION.BASE)
export class SubscriptionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Always answers 200, even when the event names a user this server
   * does not know. RevenueCat retries on any other status, and retrying
   * will not conjure a deleted account — it would only replay the same
   * event for days. Genuine failures still throw, and those we do want
   * replayed.
   */
  @Public()
  @UseGuards(RevenueCatAuthGuard)
  @HttpCode(HttpStatus.OK)
  // The global pipe whitelists and forbids everything a DTO does not
  // declare, which rejected every RevenueCat event with a 400 before it
  // reached the handler: their payload carries two dozen fields this
  // server has no opinion about. Validation still applies to the fields
  // the decision reads — the rest is simply allowed through.
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
    }),
  )
  @Post(SUBSCRIPTION.REVENUECAT_WEBHOOK)
  async handleRevenueCatWebhook(@Body() body: RevenueCatWebhookRequestDto) {
    const result = await this.commandBus.execute(
      new ApplySubscriptionEventCommand(body.event),
    );
    return ApiSuccessResponse.of(result);
  }

  /** The server's own answer, which is the one the client must trust. */
  @Get(SUBSCRIPTION.ME)
  async mySubscription(@CurrentUser() user: AuthenticatedUser) {
    return ApiSuccessResponse.of(
      await this.subscriptionService.stateFor(user.id),
    );
  }
}
