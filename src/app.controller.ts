import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiDocHealth } from './app.doc';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiDocHealth()
  healthCheck(): string {
    return this.appService.healthCheck();
  }
}
