/**
 * notify.js — ส่งข้อความแจ้งเตือนเข้า Discord ผ่าน webhook
 * - fire-and-forget: ไม่บล็อก request, ไม่ throw (ล้มเหลวก็แค่ log warn)
 * - ปิดอัตโนมัติถ้าไม่ตั้ง DISCORD_WEBHOOK_URL
 */
import config from '../config.js';

function post(payload) {
  const url = config.discordWebhookUrl;
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  }).catch((err) => console.warn(`[notify] ส่ง Discord ไม่สำเร็จ: ${err.message}`));
}

/** ส่งข้อความธรรมดา */
export function notifyDiscord(content) {
  post({ content: String(content).slice(0, 1900) });
}

/** ส่งแบบ embed (การ์ดสวย มีสี/ฟิลด์) */
export function notifyDiscordEmbed(embed) {
  post({ embeds: [embed] });
}
