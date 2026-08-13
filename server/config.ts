import { StrategyParams } from '../shared/types';

interface TelegramConfig {
  botToken: string;
  chatId: string;
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
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5110607640';
// const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '784302988';

const CONFIG: Config = {
  telegram: {
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
  },

  strategy: {
    volLength: 20,
    volMultiplier: 1.5,
    absorbBodyRatio: 0.35,
    absorbMinBars: 2,
    absorbLookback: 10,
    accumLength: 5,
    accumATRMult: 0.8,
    aggrVolMult: 1.3,
    aggrBodyRatio: 0.6,
    aggrBreakMargin: 0.1,
    atrLength: 14,
    slMultiplier: 1.5,
    rrRatio: 1.0,
    minSLPercent: 1.0,
    maxSLPercent: 5.0,
    simpleMode: true,
  },

  tokens: ['BTC', 'ETH', 'SOL'],
  timeframes: ['1H', '4H'],

  okx: {
    apiUrl: 'https://www.okx.com/api/v5',
  },
};

export default CONFIG;
