import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

function isValidDate(date: Date | null): date is Date {
  return date !== null && !isNaN(date.getTime());
}

function parseIsoToUtc(dateStr: string): Date {
  return /(Z|([+-]\d{2}:\d{2}))$/.test(dateStr) ? new Date(dateStr) : new Date(dateStr + 'Z');
}

@Injectable()
export class AppService {
  private async parseCsv(): Promise<{ timestamp: Date; price: number }[]> {
    const pricePoints: { timestamp: Date; price: number }[] = [];
    const csvFilePath = path.resolve(__dirname, '../../price_data.csv');
    if (!fs.existsSync(csvFilePath)) {
      throw new BadRequestException('CSV file not found');
    }
    const csvStream = fs
      .createReadStream(csvFilePath)
      .pipe(csv({ headers: ['timestamp', 'price'] }))
      .on('data', (row: { timestamp: string; price: string }) => {
        const timestamp = new Date(row.timestamp);
        const price = parseFloat(row.price);
        if (isValidDate(timestamp) && !isNaN(price)) {
          pricePoints.push({ timestamp, price });
        } else {
          console.warn('Skipping invalid CSV row:', row);
        }
      });
    await new Promise((resolve, reject) => {
      csvStream.on('end', resolve);
      csvStream.on('error', reject);
    });
    pricePoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (pricePoints.length === 0) {
      throw new BadRequestException('CSV file contains no valid entries.');
    }
    return pricePoints;
  }

  private validateApiParams(
    start: string,
    end: string,
    csvStartTime: Date,
    csvEndTime: Date,
  ): { startTimeFromApi: Date; endTimeFromApi: Date } {
    const startTimeFromApi = parseIsoToUtc(start);
    const endTimeFromApi = parseIsoToUtc(end);
    if (!isValidDate(startTimeFromApi)) {
      throw new BadRequestException('Invalid start time provided.');
    }
    if (!isValidDate(endTimeFromApi)) {
      throw new BadRequestException('Invalid end time provided.');
    }
    if (startTimeFromApi < csvStartTime) {
      throw new BadRequestException(
        `Start time in the request (${startTimeFromApi.toISOString()}) is earlier than the first CSV entry (${csvStartTime.toISOString()}).`,
      );
    }
    if (endTimeFromApi > csvEndTime) {
      throw new BadRequestException(
        `End time in the request (${endTimeFromApi.toISOString()}) is later than the last CSV entry (${csvEndTime.toISOString()}).`,
      );
    }
    if (endTimeFromApi < startTimeFromApi) {
      throw new BadRequestException('End time is before start time.');
    }
    return { startTimeFromApi, endTimeFromApi };
  }

  async getBestTrade(start: string, end: string) {
    try {
      const pricePoints = await this.parseCsv();
      const csvStartTime = pricePoints[0].timestamp;
      const csvEndTime = pricePoints[pricePoints.length - 1].timestamp;
      const { startTimeFromApi, endTimeFromApi } = this.validateApiParams(
        start,
        end,
        csvStartTime,
        csvEndTime,
      );

      // Filter the price data in the selected window
      const relevantPrices = pricePoints.filter(
        (entry) =>
          entry.timestamp.getTime() >= startTimeFromApi.getTime() &&
          entry.timestamp.getTime() <= endTimeFromApi.getTime(),
      );

      if (relevantPrices.length === 0) {
        throw new BadRequestException('No data points found in the given time range.');
      }

      //Let's do the business - Calculate best buy-sell times
      let maxProfit = 0;
      let bestBuyTime: Date | null = null;
      let bestSellTime: Date | null = null;
      let bestBuyPrice = 0;
      let bestSellPrice = 0;

      let lowestPrice = relevantPrices[0].price;
      let lowestPriceTime = relevantPrices[0].timestamp;

      for (const entry of relevantPrices) {
        const potentialProfit = entry.price - lowestPrice;

        if (potentialProfit > 0) {
          const currentBuyTime = lowestPriceTime;
          const currentSellTime = entry.timestamp;
          const currentDuration = currentSellTime.getTime() - currentBuyTime.getTime();

          let shouldUpdate = false;

          if (potentialProfit > maxProfit) {
            shouldUpdate = true;
          } else if (potentialProfit === maxProfit) {
            const previousDuration =
              bestSellTime && bestBuyTime
                ? bestSellTime.getTime() - bestBuyTime.getTime()
                : Infinity;

            if (currentDuration < previousDuration) {
              shouldUpdate = true;
            }
          }

          if (shouldUpdate) {
            maxProfit = potentialProfit;
            bestBuyTime = new Date(currentBuyTime);
            bestSellTime = new Date(currentSellTime);
            bestBuyPrice = lowestPrice;
            bestSellPrice = entry.price;
          }
        }

        if (entry.price < lowestPrice) {
          lowestPrice = entry.price;
          lowestPriceTime = entry.timestamp;
        }
      }

      //build response
      type TradeResponse = {
        buyTime: string | null;
        sellTime: string | null;
        buyPrice?: number;
        sellPrice?: number;
      };

      const tradeResponse: TradeResponse = {
        buyTime: isValidDate(bestBuyTime) ? bestBuyTime.toISOString() : null,
        sellTime: isValidDate(bestSellTime) ? bestSellTime.toISOString() : null,
        buyPrice: bestBuyPrice ?? undefined,
        sellPrice: bestSellPrice ?? undefined,
      };

      // Log the request's start and end time and the response
      console.log('[getBestTrade]', {
        start,
        end,
        response: tradeResponse,
      });
      return tradeResponse;
    } catch (error) {
      console.error('Error in getBestTrade():', error);
      throw error;
    }
  }
}
