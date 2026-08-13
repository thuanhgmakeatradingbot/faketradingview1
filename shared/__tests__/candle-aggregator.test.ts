import { aggregateCandles, updateAggregatedCandle } from '../candle-aggregator';
import { CandleData } from '../types';

// Build N synthetic 1M candles starting at startSec, each minute apart.
// shape(i) drives ohlc/volume so the test can assert deterministic results.
function build1M(startSec: number, count: number, shape: (i: number) => Omit<CandleData, 'time'>): CandleData[] {
  const out: CandleData[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ time: startSec + i * 60, ...shape(i) });
  }
  return out;
}

describe('aggregateCandles — building higher TFs from 1M', () => {
  test('1M passthrough returns input unchanged', () => {
    const candles = build1M(0, 5, () => ({ open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }));
    expect(aggregateCandles(candles, '1M')).toEqual(candles);
  });

  test('empty input returns empty array', () => {
    expect(aggregateCandles([], '1H')).toEqual([]);
  });

  test('unknown timeframe returns empty array', () => {
    const candles = build1M(0, 5, () => ({ open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }));
    expect(aggregateCandles(candles, '2D')).toEqual([]);
  });

  test('240×1M aggregates to exactly 4×1H with correct OHLCV', () => {
    // i ranges 0..239. Use i so each minute has a unique value — easy to verify.
    const start = 0;
    const candles = build1M(start, 240, i => ({
      open: 100 + i,
      high: 100 + i + 0.5,
      low: 100 + i - 0.5,
      close: 100 + i + 0.25,
      volume: 1, // sum per hour = 60
    }));

    const hourly = aggregateCandles(candles, '1H');
    expect(hourly).toHaveLength(4);

    // Hour 0 = bars [0..59], hour 1 = [60..119], etc.
    for (let h = 0; h < 4; h++) {
      const first = h * 60;
      const last = first + 59;
      const bar = hourly[h];
      expect(bar.time).toBe(start + h * 3600);
      expect(bar.open).toBe(100 + first);
      expect(bar.close).toBe(100 + last + 0.25);
      expect(bar.high).toBe(100 + last + 0.5);
      expect(bar.low).toBe(100 + first - 0.5);
      expect(bar.volume).toBe(60);
    }
  });

  test('240×1M aggregates to exactly 1×4H with correct OHLCV', () => {
    const candles = build1M(0, 240, i => ({
      open: 100 + i,
      high: 100 + i + 0.5,
      low: 100 + i - 0.5,
      close: 100 + i + 0.25,
      volume: 2,
    }));

    const fourH = aggregateCandles(candles, '4H');
    expect(fourH).toHaveLength(1);
    const bar = fourH[0];
    expect(bar.time).toBe(0);
    expect(bar.open).toBe(100);
    expect(bar.close).toBe(100 + 239 + 0.25);
    expect(bar.high).toBe(100 + 239 + 0.5);
    expect(bar.low).toBe(99.5);
    expect(bar.volume).toBe(2 * 240);
  });

  test('output is sorted by time ascending', () => {
    // Provide bars out of order — should still aggregate by bucket and sort.
    const c1: CandleData = { time: 7200, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 };
    const c0: CandleData = { time: 0, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 };
    const c2: CandleData = { time: 3600, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 };
    const out = aggregateCandles([c1, c0, c2], '1H');
    expect(out.map(c => c.time)).toEqual([0, 3600, 7200]);
  });
});

describe('updateAggregatedCandle — incremental 1M -> 1H/4H', () => {
  function seedHourly(): CandleData[] {
    return [
      { time: 0,    open: 100, high: 110, low: 95,  close: 108, volume: 50 },
      { time: 3600, open: 108, high: 115, low: 105, close: 112, volume: 40 },
    ];
  }

  test('1M closed in same hour: high/low/close updated, volume = old + new', () => {
    const series = seedHourly();
    const tick: CandleData = { time: 3600 + 30 * 60, open: 112, high: 120, low: 100, close: 117, volume: 7 };
    const next = updateAggregatedCandle(series, tick, '1H', true);

    expect(next).toHaveLength(2);
    const last = next[1];
    expect(last.time).toBe(3600);
    expect(last.high).toBe(120);
    expect(last.low).toBe(100);
    expect(last.close).toBe(117);
    expect(last.volume).toBe(40 + 7);
  });

  test('1M closed in NEW hour: appends a fresh 1H bar', () => {
    const series = seedHourly();
    const tick: CandleData = { time: 7200 + 5 * 60, open: 112, high: 113, low: 111, close: 112.5, volume: 3 };
    const next = updateAggregatedCandle(series, tick, '1H', true);

    expect(next).toHaveLength(3);
    const last = next[2];
    expect(last.time).toBe(7200);
    expect(last.open).toBe(112);
    expect(last.high).toBe(113);
    expect(last.low).toBe(111);
    expect(last.close).toBe(112.5);
    expect(last.volume).toBe(3);
  });

  test('1M unclosed (in-progress): high/low/close updated but volume NOT incremented', () => {
    const series = seedHourly();
    const tick: CandleData = { time: 3600 + 45 * 60, open: 112, high: 130, low: 90, close: 125, volume: 99 };
    const next = updateAggregatedCandle(series, tick, '1H', false);

    expect(next).toHaveLength(2);
    const last = next[1];
    expect(last.high).toBe(130);
    expect(last.low).toBe(90);
    expect(last.close).toBe(125);
    expect(last.volume).toBe(40); // unchanged
  });

  test('empty series returns empty (cannot bootstrap from a single tick)', () => {
    const tick: CandleData = { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 };
    expect(updateAggregatedCandle([], tick, '1H', true)).toEqual([]);
  });

  test('unknown timeframe returns the input untouched', () => {
    const series = seedHourly();
    const tick: CandleData = { time: 3600, open: 1, high: 1, low: 1, close: 1, volume: 1 };
    expect(updateAggregatedCandle(series, tick, '2D', true)).toBe(series);
  });
});
