import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

interface PriceData {
  timestamp: string;
  price: number;
}

@Injectable()
export class AppService {
  async findBestTrade(start: string, end: string, funds: number) {
    const filePath = path.join(__dirname, '..', '..', 'price_data.csv');
    const data: PriceData[] = await this.loadCSV(filePath);

    // Convert timestamps to Date for comparison
    const startTime = new Date(start);
    const endTime = new Date(end);

    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }

    // Filter by range
    const filtered = data
      .filter((row) => {
        const ts = new Date(row.timestamp);
        return ts >= startTime && ts <= endTime;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (filtered.length < 2) {
      throw new Error('Not enough data points in the given range');
    }

    let minPrice = filtered[0].price;
    let minIndex = 0;
    let maxProfit = 0;
    let bestBuy = 0;
    let bestSell = 0;

    for (let i = 1; i < filtered.length; i++) {
      const profit = filtered[i].price - minPrice;
      if (profit > maxProfit) {
        maxProfit = profit;
        bestBuy = minIndex;
        bestSell = i;
      } else if (profit === maxProfit) {
        if (i - minIndex < bestSell - bestBuy) {
          bestBuy = minIndex;
          bestSell = i;
        }
      }

      if (filtered[i].price < minPrice) {
        minPrice = filtered[i].price;
        minIndex = i;
      }
    }

    const buyPrice = filtered[bestBuy].price;
    const sellPrice = filtered[bestSell].price;
    const stocks = Math.floor(funds / buyPrice);
    const profit = stocks * (sellPrice - buyPrice);

    return {
      buy_time: filtered[bestBuy].timestamp,
      sell_time: filtered[bestSell].timestamp,
      buy_price: buyPrice,
      sell_price: sellPrice,
      stocks_bought: stocks,
      profit: parseFloat(profit.toFixed(2)),
    };
  }

  private loadCSV(filePath: string): Promise<PriceData[]> {
    return new Promise((resolve, reject) => {
      const results: PriceData[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => {
          results.push({
            timestamp: data.timestamp,
            price: parseFloat(data.price),
          });
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }
}
