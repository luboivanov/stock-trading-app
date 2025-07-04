import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/best_trade')
  getBestTrade(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('funds') funds?: string,
  ) {
    return this.appService.getBestTrade(start, end, funds);
  }
}
