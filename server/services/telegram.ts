import * as https from 'https';
import { formatTimeLog } from '../../shared/time';

const MAX_MSG_LENGTH = 4000;

function sendSingleMessage(text: string, botToken: string, chatId: string): Promise<void> {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const data = JSON.stringify({ chat_id: chatId, text });

    const options: https.RequestOptions = {
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✓ Telegram sent');
        } else {
          console.error(`Telegram error ${res.statusCode}: ${body.slice(0, 200)}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`Telegram error: ${error.message} (code: ${(error as any).code})`);
      console.error(`  URL: ${url.slice(0, 50)}...`);
      console.error(`  Data length: ${data.length} chars`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('Telegram timeout');
      resolve();
    });

    req.write(data);
    req.end();
    console.log(`[TELEGRAM] Request sent, waiting for response...`);
  });
}

export async function sendMessage(text: string, botToken: string, chatId: string): Promise<void> {
  if (!botToken || !chatId) {
    console.log(`[${formatTimeLog()}] [TELEGRAM] Missing botToken or chatId`);
    return;
  }

  console.log(`[${formatTimeLog()}] [TELEGRAM] Sending to chat ${chatId.substring(0, 4)}... (${text.length} chars)`);

  // Split if message too long
  if (text.length <= MAX_MSG_LENGTH) {
    await sendSingleMessage(text, botToken, chatId);
    return;
  }

  // Split on double newline (signal boundaries)
  const parts = text.split('\n\n');
  let chunk = '';

  for (const part of parts) {
    if (chunk.length + part.length + 2 > MAX_MSG_LENGTH && chunk.length > 0) {
      await sendSingleMessage(chunk, botToken, chatId);
      chunk = part;
    } else {
      chunk = chunk ? chunk + '\n\n' + part : part;
    }
  }

  if (chunk.length > 0) {
    await sendSingleMessage(chunk, botToken, chatId);
  }
}
