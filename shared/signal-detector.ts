import { CandleData, DetectorState, StrategyParams } from './types';

export interface SignalResult {
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  risk: string;
  conditions: string;
  pattern: string;
  phase: string;
  isValid: boolean;
  score: number;
}

export class SignalDetector3A {
  private params: StrategyParams;
  private state: DetectorState;

  constructor(strategyConfig?: Partial<StrategyParams>) {
    this.params = {
      volLength: strategyConfig?.volLength ?? 20,
      volMultiplier: strategyConfig?.volMultiplier ?? 1.5,
      absorbBodyRatio: strategyConfig?.absorbBodyRatio ?? 0.35,
      absorbMinBars: strategyConfig?.absorbMinBars ?? 2,
      absorbLookback: strategyConfig?.absorbLookback ?? 10,
      accumLength: strategyConfig?.accumLength ?? 5,
      accumATRMult: strategyConfig?.accumATRMult ?? 0.8,
      aggrVolMult: strategyConfig?.aggrVolMult ?? 1.3,
      aggrBodyRatio: strategyConfig?.aggrBodyRatio ?? 0.6,
      aggrBreakMargin: strategyConfig?.aggrBreakMargin ?? 0.1,
      atrLength: strategyConfig?.atrLength ?? 14,
      slMultiplier: strategyConfig?.slMultiplier ?? 1.5,
      rrRatio: strategyConfig?.rrRatio ?? 1.0,
      minSLPercent: strategyConfig?.minSLPercent ?? 1.0,
      maxSLPercent: strategyConfig?.maxSLPercent ?? 5.0,
      simpleMode: strategyConfig?.simpleMode ?? true,
    };

    this.state = {
      absorptionCount: 0,
      lastAbsorptionBar: 0,
      inAccumulation: false,
      accumHigh: null,
      accumLow: null,
      accumStartBar: 0,
      lastSimpleSignalBar: null,
    };
  }

  detectSignals(candleData: CandleData[]) {
    if (candleData.length < 50) return null;

    const current = candleData[candleData.length - 1];
    const barIndex = candleData.length - 1;

    const volMA = this.calculateSMA(candleData.map(c => c.volume), this.params.volLength);
    const atr = this.calculateATR(candleData, this.params.atrLength);
    const ema20 = this.calculateEMA(candleData.map(c => c.close), 20);

    const currentVolMA = volMA[volMA.length - 1];
    const currentATR = atr[atr.length - 1];
    const currentEma20 = ema20[ema20.length - 1];

    const highVolume = current.volume > currentVolMA * this.params.volMultiplier;
    const priceRange = current.high - current.low;
    const bodySize = Math.abs(current.close - current.open);
    const bodyRatio = priceRange > 0 ? bodySize / priceRange : 0;

    // PHASE 1: ABSORPTION
    const isAbsorption = highVolume &&
      bodyRatio < this.params.absorbBodyRatio &&
      priceRange > currentATR * 0.3;

    if (isAbsorption) {
      this.state.absorptionCount = 1;
      for (let i = 1; i <= this.params.absorbLookback && barIndex - i >= 0; i++) {
        const pastCandle = candleData[barIndex - i];
        const pastVolMA = volMA[volMA.length - 1 - i];
        const pastATR = atr[atr.length - 1 - i];
        const pastPriceRange = pastCandle.high - pastCandle.low;
        const pastBodySize = Math.abs(pastCandle.close - pastCandle.open);
        const pastBodyRatio = pastPriceRange > 0 ? pastBodySize / pastPriceRange : 0;
        const pastHighVolume = pastCandle.volume > pastVolMA * this.params.volMultiplier;
        const pastIsAbsorption = pastHighVolume &&
          pastBodyRatio < this.params.absorbBodyRatio &&
          pastPriceRange > pastATR * 0.3;

        if (pastIsAbsorption) this.state.absorptionCount++;
      }
      this.state.lastAbsorptionBar = barIndex;
    }

    const hasAbsorption = this.state.absorptionCount >= this.params.absorbMinBars &&
      (barIndex - this.state.lastAbsorptionBar) <= this.params.absorbLookback;

    // PHASE 2: ACCUMULATION
    const rangeHigh = Math.max(...candleData.slice(-this.params.accumLength).map(c => c.high));
    const rangeLow = Math.min(...candleData.slice(-this.params.accumLength).map(c => c.low));
    const rangeSize = rangeHigh - rangeLow;
    const isAccumulating = rangeSize < currentATR * this.params.accumATRMult;

    if (hasAbsorption && isAccumulating && !this.state.inAccumulation) {
      this.state.inAccumulation = true;
      this.state.accumHigh = rangeHigh;
      this.state.accumLow = rangeLow;
      this.state.accumStartBar = barIndex;
    }

    if (this.state.inAccumulation && this.state.accumHigh !== null && this.state.accumLow !== null) {
      this.state.accumHigh = Math.max(this.state.accumHigh, current.high);
      this.state.accumLow = Math.min(this.state.accumLow, current.low);

      if ((this.state.accumHigh - this.state.accumLow) > currentATR * this.params.accumATRMult * 2.0 ||
        (barIndex - this.state.accumStartBar) > this.params.accumLength * 3) {
        this.state.inAccumulation = false;
        this.state.accumHigh = null;
        this.state.accumLow = null;
      }
    }

    // PHASE 3: AGGRESSION
    const breakMargin = currentATR * this.params.aggrBreakMargin;

    const bullishAggression = this.state.inAccumulation && this.state.accumHigh !== null &&
      current.close > this.state.accumHigh + breakMargin &&
      current.volume > currentVolMA * this.params.aggrVolMult &&
      bodyRatio > this.params.aggrBodyRatio &&
      current.close > current.open;

    const bearishAggression = this.state.inAccumulation && this.state.accumLow !== null &&
      current.close < this.state.accumLow! - breakMargin &&
      current.volume > currentVolMA * this.params.aggrVolMult &&
      bodyRatio > this.params.aggrBodyRatio &&
      current.close < current.open;

    // SIGNAL GENERATION
    let buySignal = false;
    let sellSignal = false;

    if (this.params.simpleMode) {
      const simpleBuySignal = highVolume && bodyRatio > 0.6 && current.close > current.open && current.close > currentEma20;
      const simpleSellSignal = highVolume && bodyRatio > 0.6 && current.close < current.open && current.close < currentEma20;
      const canSimpleSignal = this.state.lastSimpleSignalBar === null || (barIndex - this.state.lastSimpleSignalBar) >= 3;

      if (simpleBuySignal && canSimpleSignal) {
        buySignal = true;
        this.state.lastSimpleSignalBar = barIndex;
      } else if (simpleSellSignal && canSimpleSignal) {
        sellSignal = true;
        this.state.lastSimpleSignalBar = barIndex;
      }
    } else {
      if (bullishAggression) {
        buySignal = true;
        this.state.inAccumulation = false;
      } else if (bearishAggression) {
        sellSignal = true;
        this.state.inAccumulation = false;
      }
    }

    // POSITION & RISK MANAGEMENT
    const volRatio = currentVolMA > 0 ? current.volume / currentVolMA : 1;
    const trendAligned = (buySignal && current.close > currentEma20) ||
      (sellSignal && current.close < currentEma20);

    if (buySignal) {
      const entry = current.close;
      const sl = this.params.simpleMode
        ? current.low - (currentATR * this.params.slMultiplier)
        : (this.state.accumLow ?? current.low) - (currentATR * this.params.slMultiplier * 0.5);
      const tp = entry + ((entry - sl) * this.params.rrRatio);
      const riskPercent = Math.abs((entry - sl) / entry * 100);

      if (riskPercent < this.params.minSLPercent || riskPercent > this.params.maxSLPercent) return null;

      return {
        type: 'BUY' as const,
        entry,
        sl,
        tp,
        risk: riskPercent.toFixed(2),
        conditions: this.params.simpleMode
          ? 'Simple: High Vol + Strong Body + Trend'
          : 'AAA: Absorption → Accumulation → Aggression',
        pattern: this.params.simpleMode ? 'Simple 3A' : 'Full 3A',
        phase: this.getCurrentPhase(),
        isValid: true,
        score: this.calculateScore(bodyRatio, volRatio, trendAligned, hasAbsorption, this.state.inAccumulation),
      };
    }

    if (sellSignal) {
      const entry = current.close;
      const sl = this.params.simpleMode
        ? current.high + (currentATR * this.params.slMultiplier)
        : (this.state.accumHigh ?? current.high) + (currentATR * this.params.slMultiplier * 0.5);
      const tp = entry - ((sl - entry) * this.params.rrRatio);
      const riskPercent = Math.abs((sl - entry) / entry * 100);

      if (riskPercent < this.params.minSLPercent || riskPercent > this.params.maxSLPercent) return null;

      return {
        type: 'SELL' as const,
        entry,
        sl,
        tp,
        risk: riskPercent.toFixed(2),
        conditions: this.params.simpleMode
          ? 'Simple: High Vol + Strong Body + Trend'
          : 'AAA: Absorption → Accumulation → Aggression',
        pattern: this.params.simpleMode ? 'Simple 3A' : 'Full 3A',
        phase: this.getCurrentPhase(),
        isValid: true,
        score: this.calculateScore(bodyRatio, volRatio, trendAligned, hasAbsorption, this.state.inAccumulation),
      };
    }

    return null;
  }

  setSimpleMode(enabled: boolean): void {
    this.params.simpleMode = enabled;
  }

  getCurrentPhase(): string {
    if (this.state.inAccumulation) return 'Accumulation';
    if (this.state.absorptionCount >= this.params.absorbMinBars) return 'Absorption';
    return 'Waiting';
  }

  resetState() {
    this.state = {
      absorptionCount: 0,
      lastAbsorptionBar: 0,
      inAccumulation: false,
      accumHigh: null,
      accumLow: null,
      accumStartBar: 0,
      lastSimpleSignalBar: null,
    };
  }

  calculateScore(bodyRatio: number, volRatio: number, trendAligned: boolean, hasAbsorption: boolean, inAccumulation: boolean): number {
    let score = 0;

    // Volume strength (0-2.5): higher volume spike = more conviction
    if (volRatio >= 3.0) score += 2.5;
    else if (volRatio >= 2.0) score += 2.0;
    else if (volRatio >= 1.5) score += 1.5;
    else score += 0.5;

    // Body strength (0-2.5): fuller candle body = stronger move
    if (bodyRatio >= 0.85) score += 2.5;
    else if (bodyRatio >= 0.7) score += 2.0;
    else if (bodyRatio >= 0.6) score += 1.5;
    else score += 0.5;

    // Trend alignment (0-2): price above/below EMA20
    if (trendAligned) score += 2.0;
    else score += 0.5;

    // 3A pattern quality (0-3): full pattern > partial > simple
    if (hasAbsorption && inAccumulation) score += 3.0;
    else if (hasAbsorption) score += 2.0;
    else if (inAccumulation) score += 1.5;
    else score += 1.0;

    return Math.min(10, Math.round(score));
  }

  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(data[i]);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  private calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  }

  private calculateATR(candleData: CandleData[], period: number): number[] {
    const tr: number[] = [];
    for (let i = 0; i < candleData.length; i++) {
      if (i === 0) {
        tr.push(candleData[i].high - candleData[i].low);
      } else {
        const high = candleData[i].high;
        const low = candleData[i].low;
        const prevClose = candleData[i - 1].close;
        const tr1 = high - low;
        const tr2 = Math.abs(high - prevClose);
        const tr3 = Math.abs(low - prevClose);
        tr.push(Math.max(tr1, tr2, tr3));
      }
    }
    return this.calculateSMA(tr, period);
  }
}
