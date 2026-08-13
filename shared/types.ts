export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  risk: string;
  pattern: string;
  phase: string;
  timestamp: number;
  detectedAt?: number;
  timeframe: string;
  symbol: string;
  score: number;
}

export interface StrategyParams {
  volLength: number;
  volMultiplier: number;
  absorbBodyRatio: number;
  absorbMinBars: number;
  absorbLookback: number;
  accumLength: number;
  accumATRMult: number;
  aggrVolMult: number;
  aggrBodyRatio: number;
  aggrBreakMargin: number;
  atrLength: number;
  slMultiplier: number;
  rrRatio: number;
  minSLPercent: number;
  maxSLPercent: number;
  simpleMode: boolean;
}

export interface DetectorState {
  absorptionCount: number;
  lastAbsorptionBar: number;
  inAccumulation: boolean;
  accumHigh: number | null;
  accumLow: number | null;
  accumStartBar: number;
  lastSimpleSignalBar: number | null;
}
