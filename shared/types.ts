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
  /** Fixed TP & SL price distance in USD (R:R 1:1). Default 800. */
  tpSlDistance: number;
  /** Extra distance added for TP2 and TP3 in the Telegram message. Default 500. */
  extraTpDistance: number;
  /** Long-probability threshold at/above which a BUY fires. Default 0.98. */
  buyThreshold: number;
  /** Long-probability threshold at/below which a SELL fires. Default 0.02. */
  sellThreshold: number;
  /** Minimum bars required before the model runs (EMA200 warmup). Default 210. */
  emaWarmup: number;
}

export interface DetectorState {
  inTrade: boolean;
  isLong: boolean;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  entryBar: number | null;
}
