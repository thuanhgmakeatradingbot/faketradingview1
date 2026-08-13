import { CandleData, DetectorState, StrategyParams } from './types';
import { computeFeatures, longProbability, MIN_BARS } from './btc-h4-model';

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

/**
 * BTC H4 RR1 signal detector — decision-tree model ported from the Pine v6
 * indicator "PB OKX BTC H4 RR1 Optimized".
 *
 * State machine (mirrors the Pine `in_trade` logic): at most one open trade at
 * a time. On each confirmed bar, first check whether the open trade hit SL/TP;
 * only when flat may a new BUY/SELL open. SL/TP use a fixed USD distance (R:R 1:1).
 *
 * The detector is stateful across calls — CoinMonitor replays growing candle
 * slices bar-by-bar through a single instance, so `entryBar` comparisons hold.
 */
export class SignalDetectorBTCH4 {
  private params: StrategyParams;
  private state: DetectorState;

  constructor(strategyConfig?: Partial<StrategyParams>) {
    this.params = {
      tpSlDistance: strategyConfig?.tpSlDistance ?? 800,
      extraTpDistance: strategyConfig?.extraTpDistance ?? 500,
      buyThreshold: strategyConfig?.buyThreshold ?? 0.98,
      sellThreshold: strategyConfig?.sellThreshold ?? 0.02,
      emaWarmup: strategyConfig?.emaWarmup ?? MIN_BARS,
    };
    this.state = this.freshState();
  }

  private freshState(): DetectorState {
    return {
      inTrade: false,
      isLong: false,
      entryPrice: null,
      stopPrice: null,
      targetPrice: null,
      entryBar: null,
    };
  }

  detectSignals(candleData: CandleData[]): SignalResult | null {
    if (candleData.length < this.params.emaWarmup) return null;

    const barIndex = candleData.length - 1;
    const current = candleData[barIndex];

    const features = computeFeatures(candleData);
    if (!features) return null;

    const prob = longProbability(features);
    const buyBias = prob >= this.params.buyThreshold;
    const sellBias = prob <= this.params.sellThreshold;

    // 1) If a trade is open, check whether THIS bar closed it (SL or TP hit).
    let closedThisBar = false;
    if (this.state.inTrade && this.state.entryBar !== null && barIndex > this.state.entryBar) {
      const hitSL = this.state.isLong
        ? current.low <= (this.state.stopPrice as number)
        : current.high >= (this.state.stopPrice as number);
      const hitTP = this.state.isLong
        ? current.high >= (this.state.targetPrice as number)
        : current.low <= (this.state.targetPrice as number);
      if (hitSL || hitTP) {
        this.state.inTrade = false;
        closedThisBar = true;
      }
    }

    // 2) Only open a new trade when flat (and not on the same bar one just closed).
    const canOpen = !this.state.inTrade && !closedThisBar;
    const dist = this.params.tpSlDistance;

    if (canOpen && buyBias) {
      const entry = current.close;
      const sl = entry - dist;
      const tp = entry + dist;
      this.openTrade(true, entry, sl, tp, barIndex);
      return this.buildSignal('BUY', entry, sl, tp, prob);
    }

    if (canOpen && sellBias) {
      const entry = current.close;
      const sl = entry + dist;
      const tp = entry - dist;
      this.openTrade(false, entry, sl, tp, barIndex);
      return this.buildSignal('SELL', entry, sl, tp, prob);
    }

    return null;
  }

  private openTrade(isLong: boolean, entry: number, sl: number, tp: number, barIndex: number): void {
    this.state.inTrade = true;
    this.state.isLong = isLong;
    this.state.entryPrice = entry;
    this.state.stopPrice = sl;
    this.state.targetPrice = tp;
    this.state.entryBar = barIndex;
  }

  private buildSignal(type: 'BUY' | 'SELL', entry: number, sl: number, tp: number, prob: number): SignalResult {
    const riskPercent = Math.abs((entry - sl) / entry * 100);
    // Conviction: BUY fires near prob=1, SELL near prob=0 — both are high-confidence.
    const conviction = type === 'BUY' ? prob : 1 - prob;
    const score = Math.max(1, Math.min(10, Math.round(conviction * 10)));
    return {
      type,
      entry,
      sl,
      tp,
      risk: riskPercent.toFixed(2),
      conditions: `Decision-tree long P=${prob.toFixed(4)} (BUY≥${this.params.buyThreshold}, SELL≤${this.params.sellThreshold})`,
      pattern: 'BTC H4 RR1',
      phase: type === 'BUY' ? 'LONG' : 'SHORT',
      isValid: true,
      score,
    };
  }

  getCurrentPhase(): string {
    if (this.state.inTrade) return this.state.isLong ? 'In LONG' : 'In SHORT';
    return 'Flat';
  }

  resetState(): void {
    this.state = this.freshState();
  }
}
