// OKX API Client for Browser WebSocket and REST API

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class OKXClientBrowser {
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private callbacks = new Map<string, Set<Function>>();
  private subscriptions = new Set<string>();
  private isReconnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: { wsUrl?: string } = {}) {
    this.wsUrl = config.wsUrl ?? 'wss://ws.okx.com:8443/ws/v5/business';
  }

  async getCandles(instId: string, bar = '1m', limit = '300'): Promise<CandleData[]> {
    const apiUrl = 'https://www.okx.com/api/v5';
    const url = `${apiUrl}/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.code !== '0' || !json.data) {
      throw new Error(json.msg ?? 'Invalid response from OKX');
    }

    return json.data.reverse().map((candle: string[]) => ({
      time: parseInt(candle[0]) / 1000,
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));
  }

  connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      this.trigger('open');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'subscribe') return;
        if (data.event === 'error') {
          this.trigger('error', data);
          return;
        }

        if (data.data && data.data.length > 0) {
          this.trigger('update', data);
        }
      } catch {}
    };

    this.ws.onerror = (error) => {
      this.trigger('error', error);
    };

    this.ws.onclose = () => {
      this.trigger('close');

      if (!this.isReconnecting) {
        this.isReconnecting = true;
        this.reconnectTimer = setTimeout(() => {
          this.isReconnecting = false;
          this.connectWebSocket();
        }, 5000);
      }
    };
  }

  subscribeCandleChannel(instId: string, bar = '1m'): void {
    this.connectWebSocket();

    const channel = `candle${bar}`;
    const subscription = { channel, instId };
    const subscriptionKey = JSON.stringify(subscription);

    if (this.subscriptions.has(subscriptionKey)) return;

    this.subscriptions.add(subscriptionKey);

    const sendSubscription = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          op: 'subscribe',
          args: [subscription]
        }));
      } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        setTimeout(sendSubscription, 100);
      }
    };

    sendSubscription();
  }

  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.callbacks.get(event)?.delete(callback);
  }

  private trigger(event: string, data?: any): void {
    this.callbacks.get(event)?.forEach((cb: Function) => cb(data));
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.callbacks.clear();
  }
}
