/**
 * session.js — จัดการ session แบบ cookie (httpOnly) หลังผู้ใช้ใส่รหัสถูก
 *
 * - เก็บ token ที่ยัง valid ไว้ใน memory (Set) — backend restart = ทุกคนต้องใส่รหัสใหม่
 * - cookie เป็น httpOnly + SameSite=Lax (JavaScript ฝั่งเบราว์เซอร์อ่านไม่ได้)
 * - ถ้าไม่ได้ตั้ง ACCESS_CODE ไว้ = ไม่บังคับล็อกอิน (เปิดให้เข้าเลย)
 */
import crypto from 'node:crypto';
import config from '../config.js';

const COOKIE_NAME = 'xbloom_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ชั่วโมง

// token ที่ออกให้และยังไม่หมดอายุ (in-memory)
const validTokens = new Set();

/** อ่านค่า cookie ตามชื่อจาก header (parse เองไม่ใช้ไลบรารีเสริม) */
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

/** ออก session ใหม่ + ตั้ง cookie ให้ response */
export function issueSession(res) {
  const token = crypto.randomBytes(32).toString('hex');
  validTokens.add(token);
  const timer = setTimeout(() => validTokens.delete(token), SESSION_TTL_MS);
  timer.unref?.(); // ไม่ต้องให้ timer นี้กันโปรเซสปิด
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
    // secure: true, // <- เปิดบรรทัดนี้เมื่อ deploy ผ่าน HTTPS
  });
}

/** ยกเลิก session ปัจจุบัน + ลบ cookie */
export function clearSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) validTokens.delete(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** ตรวจว่า request นี้มี session ที่ยัง valid ไหม */
export function isAuthed(req) {
  const token = readCookie(req, COOKIE_NAME);
  return Boolean(token && validTokens.has(token));
}

/** middleware: บล็อกถ้ายังไม่ล็อกอิน (ยกเว้นกรณีไม่ได้ตั้งรหัสไว้ = เปิด) */
export function requireSession(req, res, next) {
  if (!config.accessCode) return next(); // ไม่ได้ตั้งรหัส = ไม่บังคับล็อกอิน
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: 'auth_required' });
}
