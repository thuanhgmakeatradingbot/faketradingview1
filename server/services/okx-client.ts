import { RestClient } from 'okx-api';
import { CandleData } from '../../shared/types';

class OKXClient {
  private restClient: RestClient;

  constructor() {
    this.restClient = new RestClient({ market: 'GLOBAL' });
  }

  async getCandles(instId: string, bar = '1m', limit = '300'): Promise<CandleData[]> {
    try {
      const candles = await this.restClient.getCandles({ instId, bar, limit });
      if (!candles || candles.length === 0) {
        console.log(`[OKX] No candles returned for ${instId} ${bar}`);
        return [];
      }

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
    } catch (error: any) {
      console.error(`Candle fetch error for ${instId}:`, error.message);
      throw error;
    }
  }
}

export default OKXClient;
