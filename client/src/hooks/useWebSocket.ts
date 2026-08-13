import { useState, useEffect, useRef, useCallback } from 'react';
import { Token } from '../types/token';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WebSocketMessage {
  data: any[];
  event?: string;
  arg?: any;
  msg?: string;
}

export function useWebSocket(token: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
    const symbol = `${token}-USDT-SWAP`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log(`WebSocket connected: ${symbol}`);

      // Subscribe to 1M candle channel
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [{
          channel: 'candle1m',
          instId: symbol
        }]
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;

        if (data.event === 'subscribe') {
          console.log('Subscribed to:', data.arg);
          return;
        }

        if (data.event === 'error') {
          console.error('WebSocket error:', data.msg);
          setError(data.msg || 'Unknown error');
          return;
        }

        if (data.data && data.data.length > 0) {
          const candle = data.data[0];
          const newCandle: CandleData = {
            time: parseInt(candle[0]) / 1000,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          };

          setCandleData(prev => {
            const newData = [...prev, newCandle];
            if (newData.length > 300) {
              newData.shift();
            }
            return newData;
          });
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Failed to parse message');
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Connection error');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket closed, reconnecting in 5s...');

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [token]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [token]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    candleData,
    error,
    disconnect,
  };
}
