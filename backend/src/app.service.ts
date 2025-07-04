import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as csv from 'csv-parser';

@Injectable()
export class AppService {
  async getBestTrade(start: string, end: string, funds?: string) {
    const results: { timestamp: Date; price: number }[] = [];

    const filePath = 'price_data.csv';
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('CSV file not found');
    }

    const fileData = fs
      .createReadStream(filePath)
      .pipe(csv({ headers: ['timestamp', 'price'] }))
      .on('data', (row) => {
        results.push({
          timestamp: new Date(row.timestamp),
          price: parseFloat(row.price),
        });
      });

    await new Promise((resolve, reject) => {
      fileData.on('end', resolve);
      fileData.on('error', reject);
    });

    results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const parsedStart = new Date(start);
    const parsedEnd = new Date(end);

    const firstTimestamp = results[0]?.timestamp;
    const lastTimestamp = results[results.length - 1]?.timestamp;

    if (!firstTimestamp) {
      throw new BadRequestException('CSV file is empty');
    }

    if (!parsedStart) {
      throw new BadRequestException('Start time is invalid or missing.');
    }
    if (!parsedEnd) {
      throw new BadRequestException('End time is invalid or missing.');
    }
    if (parsedStart < firstTimestamp) {
      throw new BadRequestException('Start time is earlier than first CSV entry.');
    }
    if (parsedEnd > lastTimestamp) {
      throw new BadRequestException('End time is later than last CSV entry.');
    }

    const filtered = results.filter(
      (entry) =>
        entry.timestamp.getTime() >= parsedStart.getTime() &&
        entry.timestamp.getTime() <= parsedEnd.getTime(),
    );

    if (filtered.length === 0) {
      throw new BadRequestException('No data points in the given range.');
    }

    let maxProfit = 0;
    let buyTime: Date | null = null;
    let sellTime: Date | null = null;
    let minPrice = filtered[0].price;
    let minPriceTime = filtered[0].timestamp;

    for (const entry of filtered) {
      if (entry.price < minPrice) {
        minPrice = entry.price;
        minPriceTime = entry.timestamp;
      }

      const profit = entry.price - minPrice;
      if (profit > maxProfit) {
        maxProfit = profit;
        buyTime = minPriceTime;
        sellTime = entry.timestamp;
      }
    }

    const response: any = {
      buy: buyTime,
      sell: sellTime,
    };

    // Funds logic is moved to frontend; this is just optional for testing
    if (funds && buyTime && sellTime) {
      const buyPrice = filtered.find((x) => x.timestamp.getTime() === buyTime.getTime())?.price ?? 0;
      const sellPrice = filtered.find((x) => x.timestamp.getTime() === sellTime.getTime())?.price ?? 0;
      const shares = parseFloat(funds) / buyPrice;
      response.shares = shares;
      response.profit = shares * (sellPrice - buyPrice);
    }

    return response;
  }
}
