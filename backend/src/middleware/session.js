/**
 * session.js — จัดการ session แบบ cookie (httpOnly) พร้อมข้อมูลผู้ใช้ + role
 * - เก็บ session ใน memory (Map) — backend restart = ทุกคนต้องล็อกอินใหม่
 * - requireRole(role) ใช้บังคับสิทธิ์ระดับ role (เช่น admin เท่านั้น)
 */
import crypto from 'node:crypto';

const COOKIE_NAME = 'xbloom_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ชั่วโมง

// token -> { username, role, expiresAt }
const sessions = new Map();

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/** ออก session ใหม่ให้ผู้ใช้ + ตั้ง cookie */
export function issueSession(res, user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  const timer = setTimeout(() => sessions.delete(token), SESSION_TTL_MS);
  timer.unref?.();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
    // secure: true, // <- เปิดเมื่อ deploy ผ่าน HTTPS
  });
}

/** ยกเลิก session ปัจจุบัน */
export function clearSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** คืนข้อมูลผู้ใช้จาก session (หรือ null) */
export function getUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return { username: s.username, role: s.role };
}

export function isAuthed(req) {
  return Boolean(getUser(req));
}

/** middleware: ต้องล็อกอินแล้ว */
export function requireSession(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: 'auth_required' });
}

/** middleware: ต้องเป็น role ที่กำหนด (เช่น admin) */
export function requireRole(role) {
  return (req, res, next) => {
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: 'auth_required' });
    if (u.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
