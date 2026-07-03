import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { APP } from './shared/presentation/http/endpoints';

@Controller(APP.ROOT)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(APP.ROOT)
  getHello(): string {
    return this.appService.getHello();
  }
}
