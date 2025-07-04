import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

interface PricePoint {
  timestamp: Date;
  price: number;
}

@Controller()
export class AppController {
  private priceData: PricePoint[] = [];

  constructor() {
    const csvFilePath = path.resolve(__dirname, '../../price_data.csv');
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const timestamp = new Date(row.timestamp);
        const price = parseFloat(row.price);
        if (!isNaN(timestamp.getTime()) && !isNaN(price)) {
          this.priceData.push({ timestamp, price });
        }
      })
      .on('end', () => {
        this.priceData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        console.log(`Loaded ${this.priceData.length} records from CSV`);
      });
  }

  @Get('best_trade')
  getBestTrade(
    @Query('start') startStr: string,
    @Query('end') endStr: string,
    @Query('funds') fundsStr?: string,
  ) {
    if (!startStr || !endStr) {
      throw new BadRequestException('Start and end time are required.');
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time.');
    }

    // Ensure the requested range is within the available data range
    const firstTimestamp = this.priceData[0]?.timestamp;
    const lastTimestamp = this.priceData[this.priceData.length - 1]?.timestamp;

    if (!firstTimestamp || !lastTimestamp || start < firstTimestamp || end > lastTimestamp) {
      throw new BadRequestException('Both time points should be within the query time slice.');
    }

    const subset = this.priceData.filter(p => p.timestamp >= start && p.timestamp <= end);
    if (subset.length === 0) {
      throw new BadRequestException('No data available in the selected time range.');
    }

    let minPrice = subset[0].price;
    let minIndex = 0;
    let maxProfit = 0;
    let bestBuy = 0;
    let bestSell = 0;

    for (let i = 1; i < subset.length; i++) {
      const profit = subset[i].price - minPrice;

      if (profit > maxProfit) {
        maxProfit = profit;
        bestBuy = minIndex;
        bestSell = i;
      } else if (profit === maxProfit) {
        const currentInterval = i - minIndex;
        const bestInterval = bestSell - bestBuy;
        if (currentInterval < bestInterval) {
          bestBuy = minIndex;
          bestSell = i;
        }
      }

      if (subset[i].price < minPrice) {
        minPrice = subset[i].price;
        minIndex = i;
      }
    }

    const buy = subset[bestBuy];
    const sell = subset[bestSell];

    const response: any = {
      buy_time: buy.timestamp.toISOString(),
      sell_time: sell.timestamp.toISOString(),
      buy_price: buy.price,
      sell_price: sell.price,
    };

    // Optionally compute profit/stocks here, move to frontend instead
    if (fundsStr) {
      const funds = parseFloat(fundsStr);
      if (isNaN(funds) || funds <= 0) {
        throw new BadRequestException('Funds must be a positive number.');
      }

      /*
      const stocks = Math.floor(funds / buy.price);
      const profit = stocks * (sell.price - buy.price);
      response.stocks_bought = stocks;
      response.profit = parseFloat(profit.toFixed(2));
      */
    }

    return response;
  }
}
