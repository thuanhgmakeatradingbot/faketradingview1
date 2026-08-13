import { SignalDetector3A } from '../signal-detector';
import { CandleData } from '../types';

// Quiet baseline bar: tiny range, tiny volume, flat at `price`.
function quiet(time: number, price: number, vol = 10): CandleData {
  return { time, open: price, high: price + 0.5, low: price - 0.5, close: price, volume: vol };
}

// Build N quiet bars at `price` ending at index N-1, then return them.
function quietSeries(n: number, price = 100, vol = 10): CandleData[] {
  return Array.from({ length: n }, (_, i) => quiet(i * 60, price, vol));
}

describe('SignalDetector3A.detectSignals — building signals from candles', () => {
  test('returns null when fewer than 50 candles are supplied', () => {
    const det = new SignalDetector3A();
    expect(det.detectSignals(quietSeries(49))).toBeNull();
  });

  test('emits BUY on a high-volume bullish breakout above EMA20', () => {
    const det = new SignalDetector3A();
    const bars = quietSeries(59); // bars 0..58 are flat at 100, vol=10
    // Bar 59: big bullish body, large range, high volume — passes simple-mode gates
    bars.push({
      time: 59 * 60,
      open: 100,
      high: 103,
      low: 99.8,
      close: 102.5,
      volume: 100,
    });

    const signal = det.detectSignals(bars);
    expect(signal).not.toBeNull();
    expect(signal!.type).toBe('BUY');
    expect(signal!.entry).toBeCloseTo(102.5, 5);
    expect(signal!.tp).toBeGreaterThan(signal!.entry);
    expect(signal!.sl).toBeLessThan(signal!.entry);
    const risk = parseFloat(signal!.risk);
    expect(risk).toBeGreaterThan(1);
    expect(risk).toBeLessThan(5);
    expect(signal!.score).toBeGreaterThanOrEqual(0);
    expect(signal!.score).toBeLessThanOrEqual(10);
  });

  test('emits SELL on a high-volume bearish breakdown below EMA20', () => {
    const det = new SignalDetector3A();
    const bars = quietSeries(59);
    bars.push({
      time: 59 * 60,
      open: 100,
      high: 100.2,
      low: 97,
      close: 97.5,
      volume: 100,
    });

    const signal = det.detectSignals(bars);
    expect(signal).not.toBeNull();
    expect(signal!.type).toBe('SELL');
    expect(signal!.entry).toBeCloseTo(97.5, 5);
    expect(signal!.tp).toBeLessThan(signal!.entry);
    expect(signal!.sl).toBeGreaterThan(signal!.entry);
    const risk = parseFloat(signal!.risk);
    expect(risk).toBeGreaterThan(1);
    expect(risk).toBeLessThan(5);
  });

  test('cooldown: a second qualifying bar within 3 bars of the first hit returns null', () => {
    const det = new SignalDetector3A();
    const bars = quietSeries(59);

    // Bar 59 — first BUY hit
    bars.push({ time: 59 * 60, open: 100, high: 103, low: 99.8, close: 102.5, volume: 100 });
    const first = det.detectSignals(bars);
    expect(first).not.toBeNull();
    expect(first!.type).toBe('BUY');

    // Bar 60 — also qualifies on its own, but cooldown gates it
    bars.push({ time: 60 * 60, open: 102.5, high: 105.5, low: 102.3, close: 105, volume: 120 });
    expect(det.detectSignals(bars)).toBeNull();

    // Bar 61 — still within 3-bar cooldown
    bars.push({ time: 61 * 60, open: 105, high: 108, low: 104.8, close: 107.5, volume: 130 });
    expect(det.detectSignals(bars)).toBeNull();

    // Bar 62 — gap = 3, cooldown clears, signal allowed again
    bars.push({ time: 62 * 60, open: 107.5, high: 110, low: 107.3, close: 109.5, volume: 140 });
    const next = det.detectSignals(bars);
    expect(next).not.toBeNull();
    expect(next!.type).toBe('BUY');
  });

  test('risk filter: rejects signals whose computed risk falls below minSLPercent', () => {
    const det = new SignalDetector3A();
    // Tight series — ATR is tiny, so 1.5*ATR SL distance produces <1% risk
    const bars = quietSeries(59, 100, 10).map((c, i) => ({
      ...c,
      // collapse the noise floor so ATR is essentially the breakout bar's TR / 14
      high: 100.001,
      low: 99.999,
    }));
    bars.push({
      time: 59 * 60,
      open: 100,
      high: 100.05,
      low: 100.001,
      close: 100.04,
      volume: 100,
    });

    expect(det.detectSignals(bars)).toBeNull();
  });
});
