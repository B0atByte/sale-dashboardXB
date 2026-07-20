/**
 * server.js — จุดเริ่มต้นของ xBloom Dashboard Backend
 * ลำดับ auth: x-api-key (จาก nginx) -> session cookie (จากการใส่รหัส) -> เส้นทางข้อมูล
 *   /api/health           เปิด (Docker healthcheck)
 *   /api/session|login|logout  ต้องมี x-api-key แต่ยังไม่ต้องล็อกอิน
 *   /api/sales*           ต้องมี x-api-key + ล็อกอินแล้ว
 */
import express from 'express';
import config from './config.js';
import apiKeyAuth from './middleware/apiKey.js';
import { requireSession } from './middleware/session.js';
import { apiLimiter, freshLimiter } from './middleware/rateLimit.js';
import authRouter from './routes/auth.js';
import salesRouter from './routes/sales.js';

const app = express();
app.set('trust proxy', 1); // อยู่หลัง nginx — ให้ req.ip เป็น IP จริงจาก X-Forwarded-For
app.disable('x-powered-by');
app.use(express.json());

// Health check — ไม่ต้องใช้ API key (Docker healthcheck เรียกเส้นทางนี้)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// จำกัดจำนวน request ทั้งระบบ (กัน flood) — /api/health ด้านบนไม่ติด limit
app.use('/api', apiLimiter);

// ตั้งแต่นี้ไป ทุก /api ต้องมี x-api-key (nginx แนบให้ฝั่งเซิร์ฟเวอร์)
app.use('/api', apiKeyAuth);

// เส้นทางล็อกอิน — ต้องมี x-api-key แต่ยังไม่ต้องมี session
app.use('/api', authRouter);

// เส้นทางข้อมูล — จำกัดเข้มถ้าขอข้อมูลสด (?fresh=1) + ต้องล็อกอินแล้ว
app.use('/api', freshLimiter, requireSession, salesRouter);

// เส้นทางที่ไม่รู้จัก
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// error handler กลาง (กัน error ที่หลุดจาก middleware อื่น)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] ข้อผิดพลาดไม่คาดคิด:', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(config.port, () => {
  // หมายเหตุ: ห้าม log ค่า API key / รหัสเข้าระบบ / URL ของชีทเด็ดขาด
  console.log(`[server] xBloom Dashboard Backend พร้อมใช้งานที่พอร์ต ${config.port}`);
  console.log(
    `[server] อายุ cache: ${config.cacheTtlSeconds} วินาที | ล็อกอินด้วยรหัส: ${config.accessCode ? 'เปิด' : 'ปิด'}`
  );
});
