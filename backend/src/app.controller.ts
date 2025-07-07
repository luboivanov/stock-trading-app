import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('best-trade')
  getBestTrade(
    @Query('start') start: string,
    @Query('end') end: string,
    //@Query('funds') funds?: string,
  ) {
    return this.appService.getBestTrade(start, end);
  }
}
