import { useMemo } from 'react';
import { CandleData } from '../types/token';

const TIMEFRAMES = ['1M', '1H', '4H'] as const;

export function useMultiTimeframe(candleData: CandleData[]) {
  return useMemo(() => {
    const timeframes: Record<string, CandleData[]> = {};

    for (const tf of TIMEFRAMES) {
      timeframes[tf] = [];
    }

    // Populate 1M (original data)
    for (const candle of candleData) {
      timeframes['1M'].push(candle);
    }

    // Aggregate to 1H
    for (let i = 0; i < timeframes['1M'].length; i += 60) {
      const groupKey = Math.floor(i / 3600) * 3600;

      let group = timeframes['1H'].find(c => Math.floor(c.time / 3600) * 3600 === groupKey);

      if (!group) {
        const startIdx = Math.max(0, i - 59);
        const candles = timeframes['1M'].slice(startIdx, i + 1);

        if (candles.length > 0) {
          group = {
            time: groupKey,
            open: candles[0].open,
            high: Math.max(...candles.map(c => c.high)),
            low: Math.min(...candles.map(c => c.low)),
            close: candles[candles.length - 1].close,
            volume: candles.reduce((sum, c) => sum + c.volume, 0),
          };
          timeframes['1H'].push(group);
        }
      } else {
        group.high = Math.max(group.high, timeframes['1M'][i].high);
        group.low = Math.min(group.low, timeframes['1M'][i].low);
        group.close = timeframes['1M'][i].close;
        group.volume += timeframes['1M'][i].volume;
      }
    }

    // Aggregate to 4H
    for (let i = 0; i < timeframes['1M'].length; i += 240) {
      const groupKey = Math.floor(i / 14400) * 14400;

      let group = timeframes['4H'].find(c => Math.floor(c.time / 14400) * 14400 === groupKey);

      if (!group) {
        const startIdx = Math.max(0, i - 239);
        const candles = timeframes['1M'].slice(startIdx, i + 1);

        if (candles.length > 0) {
          group = {
            time: groupKey,
            open: candles[0].open,
            high: Math.max(...candles.map(c => c.high)),
            low: Math.min(...candles.map(c => c.low)),
            close: candles[candles.length - 1].close,
            volume: candles.reduce((sum, c) => sum + c.volume, 0),
          };
          timeframes['4H'].push(group);
        }
      } else {
        group.high = Math.max(group.high, timeframes['1M'][i].high);
        group.low = Math.min(group.low, timeframes['1M'][i].low);
        group.close = timeframes['1M'][i].close;
        group.volume += timeframes['1M'][i].volume;
      }
    }

    return timeframes;
  }, [candleData]);
}
