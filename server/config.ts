import { StrategyParams } from '../shared/types';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  /** Optional forum topic id — sent as message_thread_id when set. */
  threadId?: number;
}

interface OKXConfig {
  apiUrl: string;
}

interface Config {
  telegram: TelegramConfig;
  strategy: StrategyParams;
  tokens: string[];
  timeframes: string[];
  okx: OKXConfig;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8676131339:AAEgELictVPNdFP-TH2yvzY1nhjhtjc8VCc';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1002990350274';
// Optional forum topic id (message_thread_id). Leave undefined to post to the main chat.
const TELEGRAM_THREAD_ID = process.env.TELEGRAM_THREAD_ID
  ? parseInt(process.env.TELEGRAM_THREAD_ID, 10)
  : undefined;

const CONFIG: Config = {
  telegram: {
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
    threadId: TELEGRAM_THREAD_ID,
  },

  // BTC H4 RR1 decision-tree model params. TP/SL are a fixed USD distance (R:R 1:1).
  strategy: {
    tpSlDistance: 800,
    extraTpDistance: 500,
    buyThreshold: 0.98,
    sellThreshold: 0.02,
    emaWarmup: 210,
  },

  tokens: ['BTC'],
  timeframes: ['4H'],

  okx: {
    apiUrl: 'https://www.okx.com/api/v5',
  },
};

export default CONFIG;
