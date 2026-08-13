import React, { useState, useCallback } from 'react';
import { TokenCard } from './components/TokenCard';
import { sendTelegramMessage } from './hooks/useTelegram';
import './App.css';

const TOKENS = ['BTC', 'ETH', 'SOL'];

interface ExtendedSignal {
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  risk: string;
  conditions: string;
  phase: string;
  token: string;
  timeframe: string;
  time: string;
  timestamp: number;
}

function App() {
  const [isRunning, setIsRunning] = useState(true);
  const [simpleMode, setSimpleMode] = useState(true);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [signals, setSignals] = useState<ExtendedSignal[]>([]);
  const [totalSignalCount, setTotalSignalCount] = useState(0);

  const handleSignal = useCallback((signal: ExtendedSignal) => {
    setTotalSignalCount(prev => prev + 1);

    setSignals(prev => [signal, ...prev].slice(0, 20));
  }, []);

  const handleTestTelegram = () => {
    if (!telegramToken || !telegramChatId) {
      alert('Please enter Telegram Bot Token and Chat ID');
      return;
    }

    const message = '🧪 Test message from 3A Strategy Monitor\n\nTelegram integration is working! ✅';
    sendTelegramMessage(message, telegramToken, telegramChatId);
  };

  const getPhaseBadgeClass = (phase: string) => {
    if (phase === 'Absorption') return 'phase-absorption';
    if (phase === 'Accumulation') return 'phase-accumulation';
    return 'phase-waiting';
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🎯 3A Strategy - Multi Token Monitor</h1>
        <p>Absorption → Accumulation → Aggression | Real-time Order Flow Detection</p>
      </div>

      <div className="container">
        <div className="controls">
          <h3>⚙️ Settings</h3>
          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={simpleMode}
                onChange={(e) => setSimpleMode(e.target.checked)}
              />
              Simple Mode (High Vol + Strong Body)
            </label>
          </div>
          <div className="control-group">
            <button className="primary" onClick={() => setIsRunning(true)}>
              ▶️ Start Monitoring (1M base)
            </button>
            <button className="danger" onClick={() => setIsRunning(false)}>
              ⏸️ Stop
            </button>
            <button onClick={handleTestTelegram}>
              📱 Test Telegram
            </button>
          </div>
          <div className="control-group">
            <input
              type="text"
              placeholder="Telegram Bot Token"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              style={{ width: '300px' }}
            />
            <input
              type="text"
              placeholder="Chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>
        </div>

        <div className="status-bar">
          <div className="status-indicator">
            <div className={`status-dot ${isRunning ? 'active' : ''}`} />
            <span>{isRunning ? 'Monitoring active' : 'Ready to start'}</span>
          </div>
          <div>{TOKENS.length} tokens monitored | {totalSignalCount} signals detected</div>
        </div>

        <div className="token-grid">
          {TOKENS.map(token => (
            <TokenCard
              key={token}
              token={token}
              simpleMode={simpleMode}
              telegramConfig={{ token: telegramToken, chatId: telegramChatId }}
              onSignal={handleSignal}
              isRunning={isRunning}
            />
          ))}
        </div>

        <div className="signal-log">
          <h3>📋 Signal History</h3>
          <div style={{ marginBottom: '10px' }}>
            <button style={{ padding: '5px 10px', fontSize: '12px' }}>
              📜 Show Historical Signals
            </button>
          </div>
          <div className="signal-list">
            {signals.length === 0 ? (
              <p style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>
                No signals yet. Start monitoring to detect 3A signals.
              </p>
            ) : (
              [...signals].sort((a, b) => b.timestamp - a.timestamp).map((signal, index) => (
                <div key={index} className={`signal-item ${signal.type.toLowerCase()}`}>
                  <div className="signal-header">
                    <div className={`signal-type ${signal.type.toLowerCase()}`}>
                      {signal.type === 'BUY' ? '🚀' : '📉'} {signal.type} - {signal.token}/USDT
                    </div>
                    <div className="signal-time">
                      {signal.time} | {signal.timeframe}
                    </div>
                  </div>
                  <div className="signal-details">
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '10px' }}>ENTRY</div>
                      <div style={{ color: '#58a6ff' }}>${signal.entry.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '10px' }}>SL</div>
                      <div style={{ color: '#ff7b72' }}>${signal.sl.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '10px' }}>TP</div>
                      <div style={{ color: '#7ee787' }}>${signal.tp.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '10px' }}>RISK</div>
                      <div style={{ color: '#ffa657' }}>{signal.risk}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#8b949e' }}>
                    Pattern: {signal.conditions} | Phase: <span className={`phase-badge ${getPhaseBadgeClass(signal.phase)}`}>{signal.phase}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
