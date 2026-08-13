import React, { useEffect, useState, useRef } from 'react';
import { OKXClientBrowser } from '../services/okxClient';
import { SignalDetector3A, SignalResult } from '../../../shared/signal-detector';
import { CandleData } from '../../../shared/types';
import { aggregateCandles, updateAggregatedCandle } from '../../../shared/candle-aggregator';
import { TokenChart } from './TokenChart';
import { sendTelegramMessage } from '../hooks/useTelegram';
import { formatTime, formatTimeLog } from '../../../shared/time';

const TIMEFRAMES = ['1H', '4H'] as const;

interface TokenCardProps {
  token: string;
  simpleMode: boolean;
  telegramConfig: { token: string; chatId: string };
  onSignal: (signal: ExtendedSignal) => void;
  isRunning: boolean;
}

interface ExtendedSignal extends SignalResult {
  token: string;
  timeframe: string;
  time: string;
  timestamp: number;
}

export function TokenCard({ token, simpleMode, telegramConfig, onSignal, isRunning }: TokenCardProps) {
  const symbol = `${token}-USDT-SWAP`;
  const [price, setPrice] = useState<number | null>(null);
  const [phase, setPhase] = useState('Waiting');
  const [volume, setVolume] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [signalCount, setSignalCount] = useState(0);
  const [markers, setMarkers] = useState<{ [key: string]: any[] }>({ '1H': [], '4H': [] });

  const [data1M, setData1M] = useState<CandleData[]>([]);
  const [data1H, setData1H] = useState<CandleData[]>([]);
  const [data4H, setData4H] = useState<CandleData[]>([]);

  const okxClientRef = useRef<OKXClientBrowser | null>(null);
  const detectorsRef = useRef<{ [key: string]: SignalDetector3A }>({});
  const simpleModeRef = useRef(simpleMode);
  const prevIsRunningRef = useRef(false);

  useEffect(() => {
    simpleModeRef.current = simpleMode;
    TIMEFRAMES.forEach(tf => {
      if (detectorsRef.current[tf]) {
        detectorsRef.current[tf]!.setSimpleMode(simpleMode);
      }
    });
  }, [simpleMode]);

  useEffect(() => {
    if (!okxClientRef.current) {
      okxClientRef.current = new OKXClientBrowser();
      TIMEFRAMES.forEach(tf => {
        detectorsRef.current[tf] = new SignalDetector3A();
        detectorsRef.current[tf]!.setSimpleMode(simpleMode);
      });
    }

    return () => {
      if (okxClientRef.current) {
        okxClientRef.current.disconnect();
      }
    };
  }, []);

  const fetchHistoricalData = async () => {
    // Ensure client is initialized
    if (!okxClientRef.current) {
      okxClientRef.current = new OKXClientBrowser();
      TIMEFRAMES.forEach(tf => {
        detectorsRef.current[tf] = new SignalDetector3A();
        detectorsRef.current[tf]!.setSimpleMode(simpleMode);
      });
    }

    try {
      console.log(`📥 [${formatTimeLog()}] Fetching historical data for ${symbol}...`);

      // Fetch all timeframes directly from OKX API for full history
      const [candles1M, candles1H, candles4H] = await Promise.all([
        okxClientRef.current.getCandles(symbol, '1m', '300'),
        okxClientRef.current.getCandles(symbol, '1H', '200'),
        okxClientRef.current.getCandles(symbol, '4H', '100')
      ]);

      console.log(`✅ ${symbol}: Loaded ${candles1M.length} 1M, ${candles1H.length} 1H, ${candles4H.length} 4H candles`);

      setData1M(candles1M);
      setData1H(candles1H);
      setData4H(candles4H);

      const historicalMarkers: { [key: string]: any[] } = { '1H': [], '4H': [] };

      TIMEFRAMES.forEach(tf => {
        const relevantData = tf === '1H' ? candles1H : candles4H;

        // Use ONE stateful detector per timeframe (mirrors server/coin-monitor.ts).
        // Replay bars in order so absorption/accumulation/cooldown state carries over.
        const detector = new SignalDetector3A();
        detector.setSimpleMode(simpleMode);
        detectorsRef.current[tf] = detector;

        for (let i = 50; i <= relevantData.length; i++) {
          const historicalSlice = relevantData.slice(0, i);
          const signal = detector.detectSignals(historicalSlice);

          if (signal) {
            const candle = relevantData[i - 1];
            historicalMarkers[tf].push({
              time: candle.time,
              position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
              color: signal.type === 'BUY' ? '#26a69a' : '#ef5350',
              shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
              text: `${signal.type} ${signal.risk}%`,
              size: 2
            });

            onSignal({
              ...signal,
              token,
              timeframe: tf,
              time: formatTime(candle.time * 1000),
              timestamp: candle.time * 1000
            });
          }
        }
      });

      setMarkers(historicalMarkers);
      setSignalCount(Object.values(historicalMarkers).flat().length);
      console.log(`📊 ${symbol}: Found ${Object.values(historicalMarkers).flat().length} historical signals`);
    } catch (error) {
      console.error(`❌ Error fetching historical data for ${symbol}:`, error);
    }
  };

  useEffect(() => {
    if (!okxClientRef.current) return;

    const handleUpdate = (data: any) => {
      if (!data.data || data.data.length === 0 || !isRunning) return;

      // OKX WebSocket candle format: [ts, o, h, l, c, vol, volCcy, volQuote, confirm]
      const candleData = data.data[0];

      console.log(`⚡ Received candle for ${symbol}:`, candleData);

      const newCandle: CandleData = {
        time: parseInt(candleData[0]) / 1000,
        open: parseFloat(candleData[1]),
        high: parseFloat(candleData[2]),
        low: parseFloat(candleData[3]),
        close: parseFloat(candleData[4]),
        volume: parseFloat(candleData[5])
      };

      const isClosed = candleData[8] === '1' || candleData[8] === true;

      // Debug log
      const candleTime = formatTimeLog(newCandle.time * 1000);
      console.log(`[${candleTime}] ⚡ ${symbol} 1M candle ${isClosed ? '✅ CLOSED' : '🔄 UPDATE'}: O=${newCandle.open.toFixed(4)} H=${newCandle.high.toFixed(4)} L=${newCandle.low.toFixed(4)} C=${newCandle.close.toFixed(4)}`);

      // Update 1M data
      setData1M(prev => {
        const updated1M = [...prev];

        if (isClosed) {
          updated1M.push(newCandle);
          if (updated1M.length > 300) updated1M.shift();

          // Update aggregated timeframes AND run signal detection
          setData1H(prev1H => {
            const new1H = updateAggregatedCandle(prev1H, newCandle, '1H', true);

            // Check 1H signals immediately with fresh data
            if (new1H.length >= 50) {
              const signal = detectorsRef.current['1H']!.detectSignals(new1H);
              if (signal) {
                console.log(`\n🚀 1H SIGNAL: ${signal.type} ${symbol} @ $${signal.entry.toFixed(2)}`);

                const lastCandle = new1H[new1H.length - 1];
                const newMarker = {
                  time: lastCandle.time,
                  position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
                  color: signal.type === 'BUY' ? '#26a69a' : '#ef5350',
                  shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                  text: `${signal.type} ${signal.risk}%`,
                  size: 2
                };

                console.log(`📍 Adding 1H marker at ${formatTimeLog(lastCandle.time * 1000)}: ${signal.type}`);

                setMarkers(prev => ({
                  ...prev,
                  '1H': [...prev['1H'], newMarker]
                }));

                setSignalCount(prev => prev + 1);

                onSignal({
                  ...signal,
                  token,
                  timeframe: '1H',
                  time: formatTime(lastCandle.time * 1000),
                  timestamp: lastCandle.time * 1000
                });

                if (telegramConfig.token && telegramConfig.chatId) {
                  const emoji = signal.type === 'BUY' ? '🚀' : '📉';
                  const message = `
${emoji} <b>${signal.type} SIGNAL - 3A STRATEGY</b>

📊 <b>${token}/USDT</b> (1H)
💰 Entry: $${signal.entry.toFixed(2)}

🎯 <b>Targets:</b>
🛡️ SL: $${signal.sl.toFixed(2)} (${signal.risk}%)
💎 TP: $${signal.tp.toFixed(2)}

📋 Pattern: ${signal.conditions}
🔄 Phase: ${signal.phase}

#3AStrategy #${token} #OrderFlow
                  `.trim();

                  sendTelegramMessage(message, telegramConfig.token, telegramConfig.chatId);
                }
              }
            }

            return new1H;
          });

          setData4H(prev4H => {
            const new4H = updateAggregatedCandle(prev4H, newCandle, '4H', true);

            // Check 4H signals immediately with fresh data
            if (new4H.length >= 50) {
              const signal = detectorsRef.current['4H']!.detectSignals(new4H);
              if (signal) {
                console.log(`\n📊 4H SIGNAL: ${signal.type} ${symbol} @ $${signal.entry.toFixed(2)}`);

                const lastCandle = new4H[new4H.length - 1];
                const newMarker = {
                  time: lastCandle.time,
                  position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
                  color: signal.type === 'BUY' ? '#26a69a' : '#ef5350',
                  shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                  text: `${signal.type} ${signal.risk}%`,
                  size: 2
                };

                console.log(`📍 Adding 4H marker at ${formatTimeLog(lastCandle.time * 1000)}: ${signal.type}`);

                setMarkers(prev => ({
                  ...prev,
                  '4H': [...prev['4H'], newMarker]
                }));

                setSignalCount(prev => prev + 1);

                onSignal({
                  ...signal,
                  token,
                  timeframe: '4H',
                  time: formatTime(lastCandle.time * 1000),
                  timestamp: lastCandle.time * 1000
                });

                if (telegramConfig.token && telegramConfig.chatId) {
                  const emoji = signal.type === 'BUY' ? '🚀' : '📉';
                  const message = `
${emoji} <b>${signal.type} SIGNAL - 3A STRATEGY</b>

📊 <b>${token}/USDT</b> (4H)
💰 Entry: $${signal.entry.toFixed(2)}

🎯 <b>Targets:</b>
🛡️ SL: $${signal.sl.toFixed(2)} (${signal.risk}%)
💎 TP: $${signal.tp.toFixed(2)}

📋 Pattern: ${signal.conditions}
🔄 Phase: ${signal.phase}

#3AStrategy #${token} #OrderFlow
                  `.trim();

                  sendTelegramMessage(message, telegramConfig.token, telegramConfig.chatId);
                }
              }
            }

            return new4H;
          });

        } else if (updated1M.length > 0) {
          // Update current 1M candle (tick update)
          updated1M[updated1M.length - 1] = newCandle;

          // Update aggregated timeframes without closing (live price update)
          setData1H(prev1H => updateAggregatedCandle(prev1H, newCandle, '1H', false));
          setData4H(prev4H => updateAggregatedCandle(prev4H, newCandle, '4H', false));
        }

        return updated1M;
      });
    };

    okxClientRef.current.on('update', handleUpdate);

    return () => {
      if (okxClientRef.current) {
        okxClientRef.current.off('update', handleUpdate);
      }
    };
  }, [symbol, simpleMode, telegramConfig.token, telegramConfig.chatId, isRunning, onSignal]);

  useEffect(() => {
    if (isRunning && !prevIsRunningRef.current) {
      console.log(`🔌 Starting monitor for ${symbol}...`);

      // Initialize client if not already done
      if (!okxClientRef.current) {
        okxClientRef.current = new OKXClientBrowser();
        TIMEFRAMES.forEach(tf => {
          detectorsRef.current[tf] = new SignalDetector3A();
          detectorsRef.current[tf]!.setSimpleMode(simpleMode);
        });
      }

      fetchHistoricalData().then(() => {
        if (okxClientRef.current) {
          console.log(`📡 Subscribing to ${symbol} 1m WebSocket...`);
          okxClientRef.current.subscribeCandleChannel(symbol, '1m');
        }
      });
    }

    prevIsRunningRef.current = isRunning;
  }, [isRunning, symbol, simpleMode, telegramConfig.token, telegramConfig.chatId]);

  useEffect(() => {
    if (data1M.length > 0) {
      const current = data1M[data1M.length - 1];
      setPrice(current.close);
      setVolume(current.volume);

      if (detectorsRef.current['1H']) {
        setPhase(detectorsRef.current['1H']!.getCurrentPhase());
      }

      if (data1M.length >= 1440) {
        const oldPrice = data1M[data1M.length - 1440].close;
        const change = ((current.close - oldPrice) / oldPrice * 100);
        setChange24h(change);
      }
    }
  }, [data1M, data1H]);

  const getPhaseBadgeClass = (phase: string) => {
    if (phase === 'Absorption') return 'phase-absorption';
    if (phase === 'Accumulation') return 'phase-accumulation';
    return 'phase-waiting';
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
    return vol.toFixed(0);
  };

  return (
    <div className="token-card">
      <div className="token-header">
        <div className="token-name">{token}/USDT PERP</div>
        <div className="token-price">
          {price !== null ? `$${price.toFixed(2)}` : '--'}
        </div>
      </div>

      <TokenChart data={data1H} markers={markers['1H']} timeframe="1H" />
      <TokenChart data={data4H} markers={markers['4H']} timeframe="4H" />

      <div className="token-info">
        <div className="info-item">
          <span className="info-label">Phase (1H):</span>
          <span className="info-value">
            <span className={`phase-badge ${getPhaseBadgeClass(phase)}`}>{phase}</span>
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Volume:</span>
          <span className="info-value">
            {volume !== null ? formatVolume(volume) : '--'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">24h Change:</span>
          <span
            className="info-value"
            style={{ color: change24h !== null ? (change24h > 0 ? '#7ee787' : '#ff7b72') : undefined }}
          >
            {change24h !== null ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%` : '--'}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Signals:</span>
          <span className="info-value">{signalCount}</span>
        </div>
      </div>
    </div>
  );
}
