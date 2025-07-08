import { AppService } from './app.service';
import * as fs from 'fs';
import { EventEmitter } from 'events';

//minor comment to trigger full CI/CD cycle - GitHub Actions workflow + deployment
// Helper to mock fs.createReadStream with event emitters and required ReadStream properties
function mockCsvStream(mockData: any[]): fs.ReadStream {
  class MockStream extends EventEmitter {
    public bytesRead = 0;
    public path = '';
    public pending = false;
    public close = jest.fn();
    public destroy = jest.fn();
    public pipe() {
      setImmediate(() => {
        mockData.forEach((row) => this.emit('data', row));
        this.emit('end');
      });
      return this;
    }
  }
  return new MockStream() as unknown as fs.ReadStream;
}

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('should throw if CSV file does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    await expect(
      service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T01:00:00Z'),
    ).rejects.toThrow('CSV file not found');
  });

  it('should throw for invalid start or end time', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream([]));
    await expect(service.getBestTrade('invalid', '2025-07-05T01:00:00Z')).rejects.toThrow(
      'CSV file contains no valid entries.',
    );
    await expect(service.getBestTrade('2025-07-05T00:00:00Z', 'invalid')).rejects.toThrow(
      'CSV file contains no valid entries.',
    );
  });

  it('should throw for out-of-range queries', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '100' },
      { timestamp: '2025-07-05T00:00:01Z', price: '110' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    await expect(
      service.getBestTrade('2025-07-04T23:59:00Z', '2025-07-05T00:00:01Z'),
    ).rejects.toThrow('Start time in the request');
    await expect(
      service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:01:00Z'),
    ).rejects.toThrow('End time in the request');
    await expect(
      service.getBestTrade('2025-07-05T00:00:01Z', '2025-07-05T00:00:00Z'),
    ).rejects.toThrow('End time is before start time.');
  });

  it('should throw if no data points in range', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream([]));
    await expect(
      service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:01:00Z'),
    ).rejects.toThrow('CSV file contains no valid entries.');
  });

  it('should throw if no data points in range even if CSV has data', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Data is within the CSV's min/max, but no points in the range
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '100' },
      { timestamp: '2025-07-05T00:00:01Z', price: '110' },
      { timestamp: '2025-07-05T00:00:02Z', price: '120' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    // Query a range after the last CSV entry
    await expect(
      service.getBestTrade('2025-07-05T00:00:03Z', '2025-07-05T00:00:04Z'),
    ).rejects.toThrow(
      'End time in the request (2025-07-05T00:00:04.000Z) is later than the last CSV entry (2025-07-05T00:00:02.000Z).',
    );
  });

  it('should return correct best trade for increasing prices', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '100' },
      { timestamp: '2025-07-05T00:00:01Z', price: '110' },
      { timestamp: '2025-07-05T00:00:02Z', price: '120' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    const result = await service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:00:02Z');
    expect(result.buyTime).toBe('2025-07-05T00:00:00.000Z');
    expect(result.sellTime).toBe('2025-07-05T00:00:02.000Z');
    expect(result.buyPrice).toBe(100);
    expect(result.sellPrice).toBe(120);
  });

  it('should return earliest/shortest trade for tie', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '100' },
      { timestamp: '2025-07-05T00:00:01Z', price: '200' },
      { timestamp: '2025-07-05T00:00:02Z', price: '200' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    const result = await service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:00:02Z');
    expect(result.buyTime).toBe('2025-07-05T00:00:00.000Z');
    expect(result.sellTime).toBe('2025-07-05T00:00:01.000Z');
    expect(result.buyPrice).toBe(100);
    expect(result.sellPrice).toBe(200);
  });

  it('should throw if no good deal for decreasing prices', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '120' },
      { timestamp: '2025-07-05T00:00:01Z', price: '110' },
      { timestamp: '2025-07-05T00:00:02Z', price: '100' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    await expect(
      service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:00:02Z'),
    ).resolves.toMatchObject({
      buyTime: null,
      sellTime: null,
    });
  });

  it('should throw if no good deal for constant prices', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '100' },
      { timestamp: '2025-07-05T00:00:01Z', price: '100' },
      { timestamp: '2025-07-05T00:00:02Z', price: '100' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    await expect(
      service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:00:02Z'),
    ).resolves.toMatchObject({
      buyTime: null,
      sellTime: null,
    });
  });

  it('should return correct best trade for mixed up/down prices', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockData = [
      { timestamp: '2025-07-05T00:00:00Z', price: '100' },
      { timestamp: '2025-07-05T00:00:01Z', price: '200' },
      { timestamp: '2025-07-05T00:00:02Z', price: '300' },
      { timestamp: '2025-07-05T00:00:03Z', price: '100' },
      { timestamp: '2025-07-05T00:00:04Z', price: '230' },
    ];
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    const result = await service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:00:04Z');
    expect(result.buyTime).toBe('2025-07-05T00:00:00.000Z');
    expect(result.sellTime).toBe('2025-07-05T00:00:02.000Z');
    expect(result.buyPrice).toBe(100);
    expect(result.sellPrice).toBe(300);
  });

  it('should handle huge CSV files efficiently', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const numRows = 100_000;
    const startTimestamp = Date.parse('2025-07-05T00:00:00Z');
    const mockData = Array.from({ length: numRows }, (_, i) => ({
      timestamp: new Date(startTimestamp + i * 1000).toISOString(),
      price: (100 + i).toString(),
    }));
    jest.spyOn(fs, 'createReadStream').mockReturnValue(mockCsvStream(mockData));
    const memBefore = process.memoryUsage().heapUsed;
    const result = await service.getBestTrade(
      mockData[0].timestamp,
      mockData[mockData.length - 1].timestamp,
    );
    const memAfter = process.memoryUsage().heapUsed;
    // Should find the first as buy, last as sell
    expect(result.buyTime).toBe(mockData[0].timestamp);
    expect(result.sellTime).toBe(mockData[mockData.length - 1].timestamp);
    expect(result.buyPrice).toBe(100);
    expect(result.sellPrice).toBe(100 + numRows - 1);
    // Log memory usage delta (for manual review)
    console.log('Memory used (MB):', ((memAfter - memBefore) / 1024 / 1024).toFixed(2));
    // Optionally, assert that memory usage does not exceed a threshold (e.g., 100MB)
    expect(memAfter - memBefore).toBeLessThan(100 * 1024 * 1024);
  });

  it('should handle errors thrown in CSV stream and log them', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Mock a stream that throws an error
    const errorStream = new EventEmitter();
    (errorStream as unknown as { pipe: () => typeof errorStream }).pipe = () => errorStream;
    setTimeout(() => errorStream.emit('error', new Error('Stream error')), 0);
    jest.spyOn(fs, 'createReadStream').mockReturnValue(errorStream as unknown as fs.ReadStream);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      service.getBestTrade('2025-07-05T00:00:00Z', '2025-07-05T00:01:00Z'),
    ).rejects.toThrow('Stream error');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
