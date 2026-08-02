import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { NOTIFICATIONS } from './notification.endpoints';
import type { AuthenticatedUser } from '../../../auth/domain/entities/authenticated-user';
import { CurrentUser } from '../../../auth/presentation/current-user.decoraor';
import { GetNotificationPreferencesQuery } from '../../application/queries/get-notification-preferences.query';
import { ApiSuccessResponse } from '../../../../shared/presentation/http/api-success-response';
import { DeleteNotificationDeviceCommand } from '../../application/commands/delete-notification-device.command';
import { NotificationChannel } from '../../domain/entities/notification';
import { RegisterNotificationDeviceRequestDto } from '../../application/dto/register-notification-device.request.dto';
import { RegisterNotificationDeviceCommand } from '../../application/commands/register-notification-device.command';
import { UpdateNotificationPreferenceCommand } from '../../application/commands/update-notification-preference.command';
import { UpdateNotificationPreferenceRequestDto } from '../../application/dto/update-notification-preference.request.dto';

@Controller(NOTIFICATIONS.BASE)
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(NOTIFICATIONS.REGISTER_DEVICE)
  async registerNotificationDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: RegisterNotificationDeviceRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new RegisterNotificationDeviceCommand(
        user.id,
        data.token,
        data.timeZone,
        data.platform,
      ),
    );
    return ApiSuccessResponse.of(result);
  }

  @Get(NOTIFICATIONS.GET_PREFERENCES)
  async getNotificationPreferences(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.queryBus.execute(
      new GetNotificationPreferencesQuery(user.id),
    );
    return ApiSuccessResponse.of(result);
  }

  @Patch(NOTIFICATIONS.UPDATE_PREFERENCES)
  async updateNotificationPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code', new ParseEnumPipe(NotificationChannel))
    code: NotificationChannel,
    @Body() data: UpdateNotificationPreferenceRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new UpdateNotificationPreferenceCommand(
        user.id,
        code,
        data.enabled,
        data.slot,
      ),
    );
    return ApiSuccessResponse.of(result);
  }

  @Delete(NOTIFICATIONS.DELETE_DEVICE)
  async deleteNotificationDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
  ) {
    const result = await this.commandBus.execute(
      new DeleteNotificationDeviceCommand(user.id, token),
    );
    return ApiSuccessResponse.of(result);
  }
}
