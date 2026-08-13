import { SignalDetectorBTCH4 } from '../signal-detector';
import { computeFeatures, longProbability, MIN_BARS } from '../btc-h4-model';
import { CandleData } from '../types';

// Deterministic pseudo-random walk so the model sees realistic BTC-scale bars.
// Seeded LCG — no Math.random, so the test is reproducible.
function makeSeries(n: number, start = 60000): CandleData[] {
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: CandleData[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const drift = (rand() - 0.5) * 400; // ±200 USD moves
    const open = price;
    const close = price + drift;
    const high = Math.max(open, close) + rand() * 150;
    const low = Math.min(open, close) - rand() * 150;
    out.push({ time: i * 4 * 3600, open, high, low, close, volume: 100 + rand() * 500 });
    price = close;
  }
  return out;
}

describe('BTC H4 decision-tree model', () => {
  test('computeFeatures returns null before warmup', () => {
    expect(computeFeatures(makeSeries(MIN_BARS - 1))).toBeNull();
  });

  test('computeFeatures returns a feature vector once warmed up', () => {
    const f = computeFeatures(makeSeries(MIN_BARS + 20));
    expect(f).not.toBeNull();
    // Every numeric field must be finite (no NaN/Infinity leaking from divisions).
    for (const [key, val] of Object.entries(f as unknown as Record<string, number>)) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  test('longProbability always lands in [0, 1]', () => {
    // Sweep a range of series lengths so we exercise many different bars.
    for (let extra = 0; extra <= 60; extra += 5) {
      const f = computeFeatures(makeSeries(MIN_BARS + extra));
      if (!f) continue;
      const p = longProbability(f);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe('SignalDetectorBTCH4.detectSignals', () => {
  test('returns null before warmup', () => {
    const det = new SignalDetectorBTCH4();
    expect(det.detectSignals(makeSeries(MIN_BARS - 5))).toBeNull();
  });

  test('any emitted signal has a fixed-distance SL/TP (R:R 1:1)', () => {
    const dist = 800;
    const det = new SignalDetectorBTCH4({ tpSlDistance: dist });
    const bars = makeSeries(300);
    let emitted: ReturnType<typeof det.detectSignals> = null;
    // Replay bar-by-bar like CoinMonitor does; capture the first signal.
    for (let i = MIN_BARS; i <= bars.length; i++) {
      const sig = det.detectSignals(bars.slice(0, i));
      if (sig) { emitted = sig; break; }
    }
    if (emitted) {
      expect(Math.abs(emitted.entry - emitted.sl)).toBeCloseTo(dist, 5);
      expect(Math.abs(emitted.tp - emitted.entry)).toBeCloseTo(dist, 5);
      if (emitted.type === 'BUY') {
        expect(emitted.tp).toBeGreaterThan(emitted.entry);
        expect(emitted.sl).toBeLessThan(emitted.entry);
      } else {
        expect(emitted.tp).toBeLessThan(emitted.entry);
        expect(emitted.sl).toBeGreaterThan(emitted.entry);
      }
      expect(emitted.score).toBeGreaterThanOrEqual(1);
      expect(emitted.score).toBeLessThanOrEqual(10);
    }
  });
});
