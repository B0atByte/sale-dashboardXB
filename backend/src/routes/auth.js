/**
 * auth.js — เส้นทางล็อกอินด้วยรหัสเข้าระบบ
 *   GET  /api/session  ตรวจสถานะล็อกอินปัจจุบัน
 *   POST /api/login    ส่ง { code } มาตรวจ ถ้าถูกออก session cookie
 *   POST /api/logout   ออกจากระบบ (ลบ cookie)
 *
 * กันเดารหัสแบบ brute-force: จำกัดจำนวนครั้งที่ผิดต่อ IP (ล็อกชั่วคราวเมื่อผิดบ่อย)
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import config from '../config.js';
import { issueSession, clearSession, isAuthed } from '../middleware/session.js';

const router = Router();

/** เทียบรหัสแบบ timing-safe (ใช้ SHA-256 digest ให้ buffer ยาวเท่ากันเสมอ) */
function codeMatches(input) {
  if (!config.accessCode) return false;
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(String(config.accessCode)).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---- ตัวจำกัดจำนวนครั้งเดารหัสต่อ IP ----
const attempts = new Map(); // ip -> { fails, lockUntil }
const MAX_FAILS = 5; // ผิดครบ 5 ครั้ง
const LOCK_MS = 60_000; // ล็อก 60 วินาที

function secondsLocked(ip) {
  const a = attempts.get(ip);
  if (a?.lockUntil && Date.now() < a.lockUntil) {
    return Math.ceil((a.lockUntil - Date.now()) / 1000);
  }
  return 0;
}
function recordFail(ip) {
  const a = attempts.get(ip) || { fails: 0, lockUntil: 0 };
  a.fails += 1;
  if (a.fails >= MAX_FAILS) {
    a.lockUntil = Date.now() + LOCK_MS;
    a.fails = 0;
  }
  attempts.set(ip, a);
}

// GET /api/session — ให้ frontend รู้ว่าต้องล็อกอินไหม + ล็อกอินอยู่หรือยัง
router.get('/session', (req, res) => {
  res.json({
    authenticated: isAuthed(req),
    authRequired: Boolean(config.accessCode),
  });
});

// POST /api/login — ตรวจรหัส
router.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';

  const locked = secondsLocked(ip);
  if (locked > 0) {
    return res.status(429).json({ error: 'too_many_attempts', retryAfter: locked });
  }

  // ไม่ได้ตั้งรหัส = ให้ผ่านเลย
  if (!config.accessCode) {
    issueSession(res);
    return res.json({ ok: true });
  }

  const code = req.body?.code;
  if (typeof code === 'string' && codeMatches(code)) {
    attempts.delete(ip); // ล้างสถิติผิดเมื่อสำเร็จ
    issueSession(res);
    return res.json({ ok: true });
  }

  recordFail(ip);
  return res.status(401).json({ error: 'invalid_code' });
});

// POST /api/logout
router.post('/logout', (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

export default router;
