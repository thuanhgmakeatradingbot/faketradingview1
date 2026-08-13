import moment from 'moment-timezone';

const TZ = 'Asia/Ho_Chi_Minh';

export function now(): moment.Moment {
  return moment().tz(TZ);
}

export function formatTime(timestamp: number | Date): string {
  return moment(timestamp).tz(TZ).format('YYYY-MM-DD HH:mm:ss');
}

export function formatTimeShort(timestamp: number | Date): string {
  return moment(timestamp).tz(TZ).format('MMM D, YYYY HH:mm');
}

export function formatTimeLog(timestamp?: number | Date): string {
  return moment(timestamp).tz(TZ).format('YYYY-MM-DD HH:mm:ss z');
}

export function formatTimeTelegram(timestamp: number | Date): string {
  return moment(timestamp).tz(TZ).format('MMM D, YYYY HH:mm [GMT+7]');
}

export function getTimeframeDurationMs(timeframe: string): number {
  const map: Record<string, number> = {
    '1m': 60_000,
    '3m': 3 * 60_000,
    '5m': 5 * 60_000,
    '15m': 15 * 60_000,
    '30m': 30 * 60_000,
    '1H': 60 * 60_000,
    '2H': 2 * 60 * 60_000,
    '4H': 4 * 60 * 60_000,
    '6H': 6 * 60 * 60_000,
    '12H': 12 * 60 * 60_000,
    '1D': 24 * 60 * 60_000,
    '1W': 7 * 24 * 60 * 60_000,
  };
  return map[timeframe] ?? 60 * 60_000;
}
