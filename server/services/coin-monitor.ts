import { SignalDetector3A, SignalResult } from '../../shared/signal-detector';
import { CandleData, Signal } from '../../shared/types';
import { formatTimeLog } from '../../shared/time';
import { aggregateCandles } from '../../shared/candle-aggregator';
import OKXClient from './okx-client';
import { saveSignal, loadSignals, updateSignalResult, DBSignal } from './signal-db';

export interface WinrateStats {
  total: number;
  tp1Hit: number;
  tp2Hit: number;
  tp3Hit: number;
  slHit: number;
  pending: number;
}

interface SignalWithMeta extends Signal {
  timeframe: string;
  symbol: string;
  detectedAt: number;
}

interface HistoricalSignal extends SignalWithMeta {
  candleIndex: number;
  timeframe: string;
}

type OnSignalCallback = (signal: SignalWithMeta) => void;

class CoinMonitor {
  coin: string;
  symbol: string;
  config: any;
  okxClient: OKXClient;
  timeframes: string[];
  detectors: Record<string, SignalDetector3A>;
  data: Record<string, CandleData[]>;
  onSignal: OnSignalCallback | null;
  winrateStats: WinrateStats;

  constructor(coin: string, config: any, onSignal: OnSignalCallback | null = null) {
    this.coin = coin;
    this.symbol = `${coin}-USDT-SWAP`;
    this.config = config;
    this.okxClient = new OKXClient();
    this.timeframes = ['1H', '4H'];
    this.detectors = {};
    this.data = { '1H': [], '4H': [] };
    this.onSignal = onSignal;
    this.winrateStats = { total: 0, tp1Hit: 0, tp2Hit: 0, tp3Hit: 0, slHit: 0, pending: 0 };

    this.timeframes.forEach(tf => {
      this.detectors[tf] = new SignalDetector3A(config.strategy);
    });
  }

  async start(): Promise<SignalWithMeta[]> {
    console.log(`[${formatTimeLog()}] [START] Starting monitor for ${this.symbol}`);
    await this.fetchHistoricalData();
    return this.scanHistoricalSignals();
  }

  async fetchHistoricalData(): Promise<void> {
    try {
      // Fetch 300 1H candles — enough for 75 closed 4H bars after aggregation
      const candles1H = await this.okxClient.getCandles(this.symbol, '1H', '300');
      this.data['1H'] = candles1H;
      // Build 4H from 1H so we only need one API call per coin
      this.data['4H'] = aggregateCandles(candles1H, '4H');

      console.log(`[${formatTimeLog()}] [FETCH] ${this.symbol}: ${candles1H.length} 1H → ${this.data['4H'].length} 4H candles (aggregated)`);
    } catch (error: any) {
      // Re-throw so callers know the fetch failed — don't silently leave
      // this.data empty, which would cause the replay to skip all timeframes
      // and then fire stale historical signals on the next successful fetch.
      console.error(`[FETCH ERROR] ${this.symbol}:`, error.message);
      throw error;
    }
  }

  replayAllSignalsToDB(verbose: boolean, timeframesToScan?: string[]): { found: HistoricalSignal[]; savedCount: number; newlySaved: SignalWithMeta[] } {
    const found: HistoricalSignal[] = [];
    const detectedAt = Date.now();
    const tfs = timeframesToScan ?? this.timeframes;

    tfs.forEach(tf => {
      // Exclude the last candle — OKX always returns the currently-forming candle
      // as the final entry, so its close/volume data is incomplete.
      const candles = this.data[tf].slice(0, -1);
      if (!candles || candles.length < 50) {
        if (verbose) console.log(`  ${tf}: Not enough candles (${candles?.length || 0}), skipping`);
        return;
      }

      this.detectors[tf] = new SignalDetector3A(this.config.strategy);

      let signalCount = 0;
      for (let i = 50; i <= candles.length; i++) {
        const slice = candles.slice(0, i);
        const signal = this.detectors[tf].detectSignals(slice);
        if (signal) {
          signalCount++;
          found.push({
            type: signal.type,
            entry: signal.entry,
            sl: signal.sl,
            tp: signal.tp,
            risk: signal.risk,
            pattern: signal.pattern,
            phase: signal.phase,
            timestamp: candles[i - 1].time * 1000,
            detectedAt,
            timeframe: tf,
            symbol: this.symbol,
            candleIndex: i - 1,
            score: signal.score,
          });
        }
      }

      if (verbose) {
        if (signalCount > 0) console.log(`  Found ${signalCount} signals in ${tf}`);
        else console.log(`  ⚪ ${tf}: No signals found in ${candles.length} candles`);
      }
    });

    let savedCount = 0;
    const newlySaved: SignalWithMeta[] = [];
    for (const sig of found) {
      const inserted = saveSignal({
        symbol: sig.symbol,
        timeframe: sig.timeframe,
        type: sig.type,
        entry: sig.entry,
        sl: sig.sl,
        tp: sig.tp,
        risk: parseFloat(sig.risk) || 0,
        pattern: sig.pattern,
        phase: sig.phase,
        timestamp: sig.timestamp,
        detected_at: detectedAt,
      });
      if (inserted) {
        savedCount++;
        newlySaved.push({
          type: sig.type,
          entry: sig.entry,
          sl: sig.sl,
          tp: sig.tp,
          risk: sig.risk,
          pattern: sig.pattern,
          phase: sig.phase,
          timestamp: sig.timestamp,
          detectedAt,
          timeframe: sig.timeframe,
          symbol: sig.symbol,
          score: sig.score,
        });
      }
    }

    return { found, savedCount, newlySaved };
  }

  scanHistoricalSignals(): SignalWithMeta[] {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[${formatTimeLog()}] [SCAN] Scanning historical signals for ${this.symbol}`);
    console.log(`${'-'.repeat(70)}`);

    const { found: allFound } = this.replayAllSignalsToDB(true);

    this.computeWinrateFromCombined(allFound);

    const latest = allFound
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 1);

    if (latest.length > 0) {
      const s = latest[0];
      const emoji = s.type === 'BUY' ? '🟢' : '🔴';
      const dir = s.type === 'BUY' ? 1 : -1;
      const dist = Math.abs(s.entry - s.tp);
      const tp2 = s.entry + dir * 2 * dist;
      const tp3 = s.entry + dir * 3 * dist;
      const coin = s.symbol.replace('-USDT-SWAP', '');
      console.log(`  ${emoji} ${coin} ${s.timeframe} ${s.type} | Entry $${s.entry.toFixed(2)} | SL $${s.sl.toFixed(2)} | TP1 $${s.tp.toFixed(2)} | TP2 $${tp2.toFixed(2)} | TP3 $${tp3.toFixed(2)} | ${formatTimeLog(s.timestamp)}`);
    } else {
      console.log(`  ⚪ No signals found`);
    }

    console.log('='.repeat(70) + '\n');
    return latest;
  }

  computeWinrateFromCombined(newlyFound: HistoricalSignal[]): void {
    const dbSignals = loadSignals(this.symbol);

    const seen = new Set<string>();
    const allSignals: Array<{
      timeframe: string;
      type: 'BUY' | 'SELL';
      entry: number;
      sl: number;
      tp: number;
      candleIndex: number;
      fromDB: boolean;
      dbId?: number;
    }> = [];

    for (const sig of dbSignals) {
      const key = `${sig.symbol}|${sig.timeframe}|${sig.type}|${sig.timestamp}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const candles = this.data[sig.timeframe];
      let candleIndex = -1;
      if (candles) {
        const timeSec = sig.timestamp / 1000;
        for (let i = 0; i < candles.length; i++) {
          if (Math.abs(candles[i].time - timeSec) < 60) {
            candleIndex = i;
            break;
          }
        }
      }

      allSignals.push({
        timeframe: sig.timeframe,
        type: sig.type,
        entry: sig.entry,
        sl: sig.sl,
        tp: sig.tp,
        candleIndex,
        fromDB: true,
        dbId: sig.id,
      });
    }

    for (const sig of newlyFound) {
      const key = `${sig.symbol}|${sig.timeframe}|${sig.type}|${sig.timestamp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      allSignals.push({
        timeframe: sig.timeframe,
        type: sig.type,
        entry: sig.entry,
        sl: sig.sl,
        tp: sig.tp,
        candleIndex: sig.candleIndex,
        fromDB: false,
      });
    }

    const stats: WinrateStats = { total: 0, tp1Hit: 0, tp2Hit: 0, tp3Hit: 0, slHit: 0, pending: 0 };

    for (const sig of allSignals) {
      const candles = this.data[sig.timeframe];
      if (!candles || sig.candleIndex < 0 || sig.candleIndex >= candles.length - 1) {
        stats.pending++;
        stats.total++;
        continue;
      }

      stats.total++;
      const distance = Math.abs(sig.entry - sig.tp);
      const dir = sig.type === 'BUY' ? 1 : -1;
      const sl = sig.sl;
      const tp1 = sig.tp;
      const tp2 = sig.entry + dir * 2 * distance;
      const tp3 = sig.entry + dir * 3 * distance;

      let tp1Reached = false;
      let tp2Reached = false;
      let tp3Reached = false;
      let slReached = false;

      for (let j = sig.candleIndex + 1; j < candles.length; j++) {
        const c = candles[j];
        if (sig.type === 'BUY') {
          if (c.high >= tp1) tp1Reached = true;
          if (!slReached && c.high >= tp2) tp2Reached = true;
          if (!slReached && c.high >= tp3) tp3Reached = true;
          if (c.low <= sl) slReached = true;
        } else {
          if (c.low <= tp1) tp1Reached = true;
          if (!slReached && c.low <= tp2) tp2Reached = true;
          if (!slReached && c.low <= tp3) tp3Reached = true;
          if (c.high >= sl) slReached = true;
        }
      }

      if (tp1Reached) stats.tp1Hit++;
      if (tp2Reached) stats.tp2Hit++;
      if (tp3Reached) stats.tp3Hit++;
      if (slReached) stats.slHit++;

      if (sig.fromDB && sig.dbId) {
        let result = 'pending';
        if (slReached) result = 'sl';
        else if (tp3Reached) result = 'tp3';
        else if (tp2Reached) result = 'tp2';
        else if (tp1Reached) result = 'tp1';
        updateSignalResult(sig.dbId, result, tp1Reached, tp2Reached, tp3Reached, slReached);
      }
    }

    this.winrateStats = stats;
    const tp1Pct = stats.total > 0 ? ((stats.tp1Hit / stats.total) * 100).toFixed(0) : '0';
    const tp2Pct = stats.total > 0 ? ((stats.tp2Hit / stats.total) * 100).toFixed(0) : '0';
    const tp3Pct = stats.total > 0 ? ((stats.tp3Hit / stats.total) * 100).toFixed(0) : '0';
    console.log(`  Winrate (DB+History, ${allSignals.length} signals): TP1 ${tp1Pct}% (${stats.tp1Hit}/${stats.total}) | TP2 ${tp2Pct}% (${stats.tp2Hit}/${stats.total}) | TP3 ${tp3Pct}% (${stats.tp3Hit}/${stats.total})`);
  }

  refreshData(): Promise<void> {
    return this.fetchHistoricalData();
  }

  handleSignal(signal: SignalResult, timeframe: string, candleTimeMs?: number, detectedAtMs?: number): void {
    const emoji = signal.type === 'BUY' ? '🚀' : '📉';

    const ts = candleTimeMs ?? Date.now();
    const detectedAt = detectedAtMs ?? Date.now();
    const delayMin = Math.round((detectedAt - ts) / 60000);
    const delayTag = delayMin > 0 ? ` (+${delayMin}m delayed)` : '';

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${emoji} [${formatTimeLog()}] ${signal.type} SIGNAL DETECTED - ${this.symbol} ${timeframe}${delayTag}`);
    console.log(`${'-'.repeat(70)}`);
    console.log(`  Symbol:     ${this.symbol}`);
    console.log(`  Timeframe:  ${timeframe}`);
    console.log(`  Entry:      $${signal.entry.toFixed(4)}`);
    console.log(`  Stop Loss:  $${signal.sl.toFixed(4)} (${signal.risk}%)`);
    console.log(`  Take Profit:$${signal.tp.toFixed(4)}`);
    console.log(`  Pattern:    ${signal.pattern}`);
    console.log(`  Phase:      ${signal.phase}`);
    console.log('='.repeat(70) + '\n');

    const saved = saveSignal({
      symbol: this.symbol,
      timeframe,
      type: signal.type,
      entry: signal.entry,
      sl: signal.sl,
      tp: signal.tp,
      risk: parseFloat(signal.risk) || 0,
      pattern: signal.pattern,
      phase: signal.phase,
      timestamp: ts,
      detected_at: detectedAt,
    });
    if (saved) console.log(`  [DB] Signal saved to SQLite`);
    if (this.onSignal) {
      this.onSignal({
        ...signal,
        timestamp: candleTimeMs ?? Date.now(),
        detectedAt,
        timeframe,
        symbol: this.symbol,
      });
    }
  }

  stop(): void {
    // No-op: no WS or timers to clean up in REST-only mode
  }
}

export default CoinMonitor;
