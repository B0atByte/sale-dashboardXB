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

const router = Router();

const attempts = new Map(); // ip -> { fails, lockUntil }
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

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

router.get('/session', (req, res) => {
  const u = getUser(req);
  res.json({ authenticated: Boolean(u), user: u });
});

router.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const locked = secondsLocked(ip);
  if (locked > 0) {
    return res.status(429).json({ error: 'too_many_attempts', retryAfter: locked });
  }

  const { username, pin } = req.body || {};
  const user = verifyUser(username, pin);
  if (user) {
    attempts.delete(ip);
    issueSession(res, user);
    return res.json({ ok: true, user });
  }

  recordFail(ip);
  return res.status(401).json({ error: 'invalid_credentials' });
});

router.post('/logout', (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

export default router;
