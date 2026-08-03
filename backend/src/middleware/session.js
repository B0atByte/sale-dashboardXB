/**
 * session.js — จัดการ session แบบ cookie (httpOnly)
 * - ที่เก็บ session อยู่ใน services/sessionStore.js (memory หรือ Redis ตาม REDIS_URL)
 * - attachUser: middleware โหลด session แล้วแปะที่ req.user (รันก่อน route) → getUser เป็น sync
 * - requireRole(minRole): บังคับสิทธิ์ระดับ role (สูงกว่าเข้าถึงได้ด้วย)
 */
import crypto from 'node:crypto';
import config from '../config.js';
import { roleRank } from '../services/users.js';
import {
  sessionSet,
  sessionGet,
  sessionDel,
  sessionDelByUser,
} from '../services/sessionStore.js';

const COOKIE_NAME = 'xbloom_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ชั่วโมง

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

/** ออก session ใหม่ให้ผู้ใช้ (เขียนลง store) + ตั้ง cookie */
export async function issueSession(res, user) {
  const token = crypto.randomBytes(32).toString('hex');
  await sessionSet(
    token,
    { username: user.username, role: user.role, access: user.access || null },
    SESSION_TTL_MS
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
    secure: config.cookieSecure, // ตั้ง COOKIE_SECURE=true ใน .env เมื่อ deploy ผ่าน HTTPS
  });
}

/** ยกเลิก session ปัจจุบัน */
export async function clearSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) await sessionDel(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** ยกเลิก session ทั้งหมดของผู้ใช้คนหนึ่ง (เรียกตอนลบผู้ใช้) */
export async function revokeUserSessions(username) {
  return sessionDelByUser(username);
}

/**
 * middleware: โหลด session จาก store แล้วแปะไว้ที่ req.user (null ถ้าไม่มี/หมดอายุ)
 * รันก่อน route ทั้งหมด → ทำให้ getUser(req) เป็น sync (อ่าน req.user) โดยไม่ต้องแก้ทุกจุดเรียก
 */
export async function attachUser(req, _res, next) {
  try {
    const token = readCookie(req, COOKIE_NAME);
    req.user = token ? await sessionGet(token) : null;
  } catch (err) {
    console.error(`[session] attachUser ผิดพลาด: ${err.message}`);
    req.user = null;
  }
  next();
}

/** คืนข้อมูลผู้ใช้จาก session (sync — อ่านจาก req.user ที่ attachUser แปะไว้) */
export function getUser(req) {
  return req.user || null;
}

export function isAuthed(req) {
  return Boolean(req.user);
}

/** middleware: ต้องล็อกอินแล้ว */
export function requireSession(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: 'auth_required' });
}

/** middleware: ต้องมีสิทธิ์อย่างน้อย minRole (role สูงกว่าเข้าถึงได้ด้วย) */
export function requireRole(minRole) {
  const need = roleRank(minRole);
  return (req, res, next) => {
    const u = req.user;
    if (!u) return res.status(401).json({ error: 'auth_required' });
    if (roleRank(u.role) < need) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
