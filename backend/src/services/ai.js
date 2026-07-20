/**
 * ai.js — เรียกโมเดล AI (DeepSeek / OpenAI-compatible) แบบ chat completion
 * คีย์อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น (backend/.env) เบราว์เซอร์ไม่เคยเห็น
 */
import config from '../config.js';

/** error เฉพาะของฝั่ง AI (map เป็น 502 ที่ route) */
export class AiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiError';
  }
}

/** ตรวจว่าเปิดใช้ AI ไหม (มี key หรือยัง) */
export function aiEnabled() {
  return Boolean(config.aiApiKey);
}

/**
 * ส่ง messages ไปให้โมเดลแล้วคืนข้อความตอบกลับ (string)
 * @param {Array<{role:string, content:string}>} messages
 * @param {{maxTokens?:number, temperature?:number}} [opts]
 */
export async function chatCompletion(messages, { maxTokens = 500, temperature = 0.4 } = {}) {
  if (!config.aiApiKey) throw new AiError('ยังไม่ได้ตั้งค่า AI (ไม่มี AI_API_KEY)');

  let res;
  try {
    res = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new AiError(`เชื่อมต่อ AI ไม่สำเร็จ: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AiError(`AI upstream ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new AiError('AI ไม่ได้ส่งเนื้อหากลับมา');
  return content.trim();
}
