/**
 * config.js — โหลดค่า config จากไฟล์ .env (อ่านเองแบบ manual ไม่ใช้ dotenv)
 * และตรวจสอบว่าค่าที่จำเป็นถูกตั้งไว้ครบถ้วน ถ้าไม่ครบจะ exit พร้อมข้อความภาษาไทย
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * อ่านไฟล์ .env แบบ manual (รูปแบบ KEY=VALUE ทีละบรรทัด)
 * - ข้ามบรรทัดว่างและบรรทัดคอมเมนต์ (#)
 * - ค่าใน process.env ที่ตั้งไว้แล้ว (เช่นจาก Docker) จะมีความสำคัญกว่าไฟล์ .env
 */
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // ตัดเครื่องหมายคำพูดครอบค่า ถ้ามี
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ไฟล์ .env อยู่ที่ root ของโปรเจกต์ backend (ถัดขึ้นไปหนึ่งระดับจาก src/)
loadEnvFile(path.resolve(__dirname, '..', '.env'));

const missing = [];
if (!process.env.SHEET_CSV_URL) missing.push('SHEET_CSV_URL');
if (!process.env.API_KEY) missing.push('API_KEY');

if (missing.length > 0) {
  console.error(
    `[config] ข้อผิดพลาด: ไม่พบตัวแปรสภาพแวดล้อมที่จำเป็น: ${missing.join(', ')}\n` +
      'กรุณาสร้างไฟล์ .env (ดูตัวอย่างจาก .env.example) หรือกำหนดตัวแปรดังกล่าวก่อนเริ่มเซิร์ฟเวอร์'
  );
  process.exit(1);
}

const config = {
  /** URL ของ Google Sheets ที่ publish เป็น CSV */
  sheetCsvUrl: process.env.SHEET_CSV_URL,
  /** API key สำหรับตรวจสอบ header x-api-key */
  apiKey: process.env.API_KEY,
  /** พอร์ตของเซิร์ฟเวอร์ (ค่าเริ่มต้น 3001) */
  port: Number(process.env.PORT) || 3001,
  /** อายุ cache ของข้อมูลชีท หน่วยเป็นวินาที (ค่าเริ่มต้น 300) */
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 300,
  /** รหัสเข้าระบบ — ถ้าเว้นว่าง (undefined) = ไม่ต้องล็อกอิน */
  accessCode: process.env.ACCESS_CODE || '',
  /** AI (DeepSeek / OpenAI-compatible) — ถ้าไม่มี key = ปิดฟีเจอร์ AI */
  aiApiKey: process.env.AI_API_KEY || '',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
  aiModel: process.env.AI_MODEL || 'deepseek-chat',
  /**
   * pepper สำหรับ hash PIN — แยกจาก API_KEY เพื่อให้ rotate API_KEY ได้โดยไม่ทำให้
   * PIN ทุกคนใช้ไม่ได้ (ถ้าไม่ตั้ง PIN_PEPPER จะ fallback เป็น API_KEY เพื่อความเข้ากันได้)
   */
  pinPepper: process.env.PIN_PEPPER || process.env.API_KEY,
  /** ตั้ง cookie ด้วย Secure flag — เปิดเป็น true เมื่อ deploy ผ่าน HTTPS แล้วเท่านั้น */
  cookieSecure: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true',
  /** PIN เริ่มต้นของ role itsupport (ลับ) — seed อัตโนมัติถ้าตั้งค่าไว้ */
  itAccessCode: process.env.IT_ACCESS_CODE || '',
  /** Discord webhook สำหรับแจ้งเตือน log กิจกรรม (เว้นว่าง = ปิดการแจ้งเตือน) */
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
};

export default config;
