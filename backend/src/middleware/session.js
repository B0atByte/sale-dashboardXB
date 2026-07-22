/**
 * session.js — จัดการ session แบบ cookie (httpOnly) พร้อมข้อมูลผู้ใช้ + role
 * - เก็บ session ใน memory (Map) — backend restart = ทุกคนต้องล็อกอินใหม่
 * - requireRole(role) ใช้บังคับสิทธิ์ระดับ role (เช่น admin เท่านั้น)
 */
import crypto from 'node:crypto';
import config from '../config.js';
import { roleRank } from '../services/users.js';

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
    secure: config.cookieSecure, // ตั้ง COOKIE_SECURE=true ใน .env เมื่อ deploy ผ่าน HTTPS
  });
}

/** ยกเลิก session ปัจจุบัน */
export function clearSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** ยกเลิก session ทั้งหมดของผู้ใช้คนหนึ่ง (เรียกตอนลบผู้ใช้ เพื่อไม่ให้ยังใช้งานได้ถึง 12 ชม.) */
export function revokeUserSessions(username) {
  const uname = String(username || '').toLowerCase();
  if (!uname) return 0;
  let n = 0;
  for (const [token, s] of sessions) {
    if (String(s.username || '').toLowerCase() === uname) {
      sessions.delete(token);
      n += 1;
    }
  }
  return n;
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

/** middleware: ต้องมีสิทธิ์อย่างน้อย minRole (role สูงกว่าเข้าถึงได้ด้วย เช่น itsupport เข้าทุกอย่างที่ admin เข้าได้) */
export function requireRole(minRole) {
  const need = roleRank(minRole);
  return (req, res, next) => {
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: 'auth_required' });
    if (roleRank(u.role) < need) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
