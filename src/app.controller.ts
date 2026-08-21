import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Get API Health Status',
  })
  @Get('health')
  getHealth(): string {
    return this.appService.getHealth();
  }
}
