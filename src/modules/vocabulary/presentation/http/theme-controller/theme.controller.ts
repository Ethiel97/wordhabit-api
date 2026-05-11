import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateThemeRequestDto } from '../../../application/dto/create-theme.request.dto';
import { ApiSuccessResponse } from '../../../../../shared/presentation/http/api-success-response';
import { CreateThemeCommand } from '../../../application/commands/create-theme.command';
import { ListThemesQuery } from '../../../application/queries/list-themes.query';
import { GetThemeBySlugQuery } from '../../../application/queries/get-theme-by-slug.query';
import { UpdateThemeRequestDto } from '../../../application/dto/update-theme.request.dto';
import { UpdateThemeCommand } from '../../../application/commands/update-theme.command';
import { DeleteThemeCommand } from '../../../application/commands/delete-theme.command';

@Controller('vocabulary/themes')
export class ThemeController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createTheme(@Body() body: CreateThemeRequestDto) {
    const result = await this.commandBus.execute(
      new CreateThemeCommand(body.name, body.slug, body.description),
    );
    return ApiSuccessResponse.of(result);
  }

  @Get()
  async listThemes() {
    const result = await this.queryBus.execute(new ListThemesQuery());
    return ApiSuccessResponse.of(result);
  }

  @Get(':slug')
  async getThemeBySlug(@Param('slug') slug: string) {
    const result = await this.queryBus.execute(new GetThemeBySlugQuery(slug));
    return ApiSuccessResponse.of(result);
  }

  @Patch(':id')
  async updateTheme(
    @Param('id') id: string,
    @Body() body: UpdateThemeRequestDto,
  ) {
    const result = await this.commandBus.execute(
      new UpdateThemeCommand(id, body.name, body.description),
    );
    return ApiSuccessResponse.of(result);
  }

  @Delete(':id')
  async deleteTheme(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteThemeCommand(id));
    return ApiSuccessResponse.of(null);
  }
}
