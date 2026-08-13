import { useState, useCallback, useMemo } from 'react';
import { CandleData, Signal } from '../../../shared/types';
import { SignalDetector3A, SignalResult } from '../../../shared/signal-detector';

export function useSignals(candleData: CandleData[]) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const detector = useMemo(() => new SignalDetector3A(), []);

  const checkForSignals = useCallback((isClosed: boolean) => {
    if (!isClosed) return;

    const signal: SignalResult | null = detector.detectSignals(candleData);
    if (signal) {
      const fullSignal: Signal = {
        ...signal,
        timestamp: Date.now(),
        timeframe: '',
        symbol: '',
      };
      setSignals(prev => [...prev, fullSignal]);
    }
  }, [candleData, detector]);

  return {
    signals,
    checkForSignals,
    detector,
  };
}
