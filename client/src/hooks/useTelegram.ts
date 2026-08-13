export async function sendTelegramMessage(message: string, botToken: string, chatId: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Telegram message sent');
      return true;
    } else {
      console.error('❌ Telegram error:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Telegram request error:', error);
    return false;
  }
}
