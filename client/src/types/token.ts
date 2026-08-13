export type { CandleData, Signal, StrategyParams, DetectorState } from '../../../shared/types';

export interface Token {
  symbol: string;
  name: string;
  price: number;
  volume: number;
  change24h: number;
  phase: 'Absorption' | 'Accumulation' | 'Waiting';
  signals: number;
}
