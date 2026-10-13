import { RestClient } from 'okx-api';
import { CandleData } from '../../shared/types';

class OKXClient {
  private restClient: RestClient;

  constructor() {
    this.restClient = new RestClient({ market: 'GLOBAL' });
  }

  private mapCandles(candles: any[]): CandleData[] {
    if (candles.length === 0) return [];
    const first = candles[0];
    const mapped: CandleData[] = Array.isArray(first)
      ? candles.map((candle: any[]) => ({
          time: parseInt(candle[0]) / 1000,
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5]),
        }))
      : candles.map((candle: any) => ({
          time: parseInt(candle.ts) / 1000,
          open: parseFloat(candle.o),
          high: parseFloat(candle.h),
          low: parseFloat(candle.l),
          close: parseFloat(candle.c),
          volume: parseFloat(candle.vol),
        }));
    return mapped.sort((a, b) => a.time - b.time);
  }

  async getCandles(instId: string, bar = '1m', limit = '300'): Promise<CandleData[]> {
    try {
      const candles = await this.restClient.getCandles({ instId, bar, limit });
      if (!candles || candles.length === 0) {
        console.log(`[OKX] No candles returned for ${instId} ${bar}`);
        return [];
      }
      return this.mapCandles(candles as any[]);
    } catch (error: any) {
      console.error(`Candle fetch error for ${instId}:`, error.message);
      throw error;
    }
  }

  /**
   * OKX returns at most 300 candles per request. Page backwards from the
   * current candles until the requested lookback is available.
   */
  async getCandleHistory(instId: string, bar: string, lookback: number): Promise<CandleData[]> {
    const candlesByTime = new Map<number, CandleData>();
    const latest = await this.getCandles(instId, bar, '300');
    latest.forEach(candle => candlesByTime.set(candle.time, candle));

    let oldestTime = latest.length > 0 ? latest[0].time : undefined;
    while (oldestTime !== undefined && candlesByTime.size < lookback) {
      try {
        const page = await this.restClient.getHistoricCandles({
          instId,
          bar,
          after: String(Math.round(oldestTime * 1000)),
          limit: '300',
        });
        const olderCandles = this.mapCandles(page as any[]);
        if (olderCandles.length === 0) break;

        const previousOldest = oldestTime;
        olderCandles.forEach(candle => candlesByTime.set(candle.time, candle));
        oldestTime = olderCandles[0].time;

        // Prevent an endless loop if the exchange returns an overlapping page.
        if (oldestTime >= previousOldest) break;
      } catch (error: any) {
        console.error(`Historic candle fetch error for ${instId}:`, error.message);
        throw error;
      }
    }

    return [...candlesByTime.values()]
      .sort((a, b) => a.time - b.time)
      .slice(-lookback);
  }
}

export default OKXClient;
