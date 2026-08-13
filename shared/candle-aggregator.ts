import { CandleData } from './types';

const TIMEFRAME_SECONDS: Record<string, number> = {
  '1M': 60,
  '1H': 3600,
  '4H': 14400,
};

export function aggregateCandles(candles: CandleData[], targetTimeframe: string): CandleData[] {
  if (!candles || candles.length === 0) return [];
  if (targetTimeframe === '1M') return candles;

  const targetSeconds = TIMEFRAME_SECONDS[targetTimeframe];
  if (!targetSeconds) return [];

  const aggregated = new Map<number, CandleData>();

  for (const candle of candles) {
    const groupKey = Math.floor(candle.time / targetSeconds) * targetSeconds;

    if (!aggregated.has(groupKey)) {
      aggregated.set(groupKey, {
        time: groupKey,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
    } else {
      const existing = aggregated.get(groupKey)!;
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
      existing.volume += candle.volume;
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => a.time - b.time);
}

export function updateAggregatedCandle(
  existingData: CandleData[],
  newCandle: CandleData,
  timeframe: string,
  is1MClosed: boolean
): CandleData[] {
  if (!existingData || existingData.length === 0) return [];

  const targetSeconds = TIMEFRAME_SECONDS[timeframe];
  if (!targetSeconds) return existingData;

  const groupKey = Math.floor(newCandle.time / targetSeconds) * targetSeconds;
  const updated = [...existingData];
  const existingIndex = updated.findIndex(c => Math.floor(c.time / targetSeconds) * targetSeconds === groupKey);

  if (existingIndex === -1) {
    updated.push({
      time: groupKey,
      open: newCandle.open,
      high: newCandle.high,
      low: newCandle.low,
      close: newCandle.close,
      volume: newCandle.volume,
    });
  } else {
    const existing = updated[existingIndex];
    updated[existingIndex] = {
      ...existing,
      high: Math.max(existing.high, newCandle.high),
      low: Math.min(existing.low, newCandle.low),
      close: newCandle.close,
      volume: existing.volume + (is1MClosed ? newCandle.volume : 0),
    };
  }

  if (updated.length > 200) {
    updated.shift();
  }

  return updated.sort((a, b) => a.time - b.time);
}
