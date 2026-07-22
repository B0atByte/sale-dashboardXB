/**
 * auth.js — ล็อกอินด้วย username + PIN (แบ่งสิทธิ์ตาม role)
 *   GET  /api/session  สถานะล็อกอิน + ข้อมูลผู้ใช้ (username, role)
 *   POST /api/login    { username, pin }
 *   POST /api/logout
 * มีตัวกันเดา PIN แบบ brute-force ต่อ IP
 */
import { Router } from 'express';
import { verifyUser } from '../services/users.js';
import { issueSession, clearSession, getUser } from '../middleware/session.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const attempts = new Map(); // ip -> { fails, lockUntil, seen }
const MAX_FAILS = 5;
const BASE_LOCK_MS = 60_000; // ล็อกครั้งแรก 1 นาที
const MAX_LOCK_MS = 15 * 60_000; // เพดานล็อก 15 นาที
const ATTEMPT_TTL_MS = 60 * 60_000; // ล้าง entry ที่เงียบเกิน 1 ชม. (กัน map โตไม่จำกัด)

function secondsLocked(ip) {
  const a = attempts.get(ip);
  if (a?.lockUntil && Date.now() < a.lockUntil) {
    return Math.ceil((a.lockUntil - Date.now()) / 1000);
  }
  return 0;
}
function recordFail(ip) {
  const a = attempts.get(ip) || { fails: 0, lockUntil: 0, seen: 0 };
  a.fails += 1;
  a.seen = Date.now();
  if (a.fails >= MAX_FAILS) {
    // exponential backoff: ยิ่งพยายามซ้ำหลังโดนล็อก ยิ่งล็อกนานขึ้น (ไม่รีเซ็ตตัวนับ)
    const over = a.fails - MAX_FAILS;
    a.lockUntil = Date.now() + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** over);
  }
  attempts.set(ip, a);
}

// กวาดล้าง entry เก่าเป็นระยะ (กัน memory leak จาก IP ที่ fail แล้วหายไป)
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, a] of attempts) {
    if (now - (a.seen || 0) > ATTEMPT_TTL_MS && (!a.lockUntil || now > a.lockUntil)) {
      attempts.delete(ip);
    }
  }
}, 10 * 60_000);
sweepTimer.unref?.();

router.get('/session', (req, res) => {
  const u = getUser(req);
  res.json({ authenticated: Boolean(u), user: u });
});

router.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const { username, pin } = req.body || {};
  const uname = String(username || '-').trim() || '-';

  const locked = secondsLocked(ip);
  if (locked > 0) {
    logActivity({ type: 'login_locked', actor: uname, ip, detail: `ล็อกอีก ${locked}s` });
    return res.status(429).json({ error: 'too_many_attempts', retryAfter: locked });
  }

  const user = verifyUser(username, pin);
  if (user) {
    attempts.delete(ip);
    issueSession(res, user);
    logActivity({ type: 'login_success', actor: user.username, role: user.role, ip });
    return res.json({ ok: true, user });
  }

  recordFail(ip);
  logActivity({ type: 'login_fail', actor: uname, ip, detail: 'PIN ไม่ถูกต้อง' });
  return res.status(401).json({ error: 'invalid_credentials' });
});

router.post('/logout', (req, res) => {
  const u = getUser(req);
  clearSession(req, res);
  if (u) logActivity({ type: 'logout', actor: u.username, role: u.role, ip: req.ip || 'unknown' });
  res.json({ ok: true });
});

export default router;
