import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('best_trade')
  async getBestTrade(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('funds') funds: string,
  ) {
    if (!start || !end || !funds) {
      throw new BadRequestException('Missing required query parameters');
    }

    const fundsNum = parseFloat(funds);
    if (isNaN(fundsNum) || fundsNum <= 0) {
      throw new BadRequestException('Funds must be a positive number');
    }

    try {
      return await this.appService.findBestTrade(start, end, fundsNum);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
