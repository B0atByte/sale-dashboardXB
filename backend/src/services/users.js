/**
 * users.js — จัดการผู้ใช้ (username + PIN + role) เก็บใน data/users.json
 * - PIN เก็บเป็น hash (sha256 + pepper) ไม่เก็บ plaintext
 * - ถ้ายังไม่มีไฟล์ผู้ใช้ จะสร้าง admin เริ่มต้น (PIN = ACCESS_CODE จาก .env, สำรอง 1234)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export const ROLES = ['admin', 'viewer'];

function pepper() {
  return config.apiKey || 'xbloom-static-pepper';
}
function hashPin(username, pin) {
  return crypto
    .createHash('sha256')
    .update(`${String(username).toLowerCase()}:${pin}:${pepper()}`)
    .digest('hex');
}

function readFile() {
  try {
    const arr = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}
function writeFile(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

/** โหลดผู้ใช้ทั้งหมด สร้าง admin เริ่มต้นถ้ายังไม่มี */
function ensureSeed() {
  let users = readFile();
  if (!users || users.length === 0) {
    const pin = config.accessCode || '1234';
    users = [{ username: 'admin', pinHash: hashPin('admin', pin), role: 'admin' }];
    writeFile(users);
  }
  return users;
}

/** รายชื่อผู้ใช้ (ไม่รวม hash) */
export function listUsers() {
  return ensureSeed().map((u) => ({ username: u.username, role: u.role }));
}

/** ตรวจ username + PIN → คืน {username, role} หรือ null */
export function verifyUser(username, pin) {
  const users = ensureSeed();
  const uname = String(username || '').trim();
  const u = users.find((x) => x.username.toLowerCase() === uname.toLowerCase());
  if (!u) return null;
  const h = hashPin(u.username, String(pin || ''));
  const a = Buffer.from(h);
  const b = Buffer.from(u.pinHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { username: u.username, role: u.role };
}

/** เพิ่มผู้ใช้ใหม่ */
export function addUser(username, pin, role) {
  const uname = String(username || '').trim();
  if (!uname || !/^[a-zA-Z0-9_.\- ]{2,20}$/.test(uname)) return { error: 'invalid_username' };
  if (!/^\d{4,8}$/.test(String(pin || ''))) return { error: 'invalid_pin' };
  if (!ROLES.includes(role)) return { error: 'invalid_role' };
  const users = ensureSeed();
  if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
    return { error: 'duplicate' };
  }
  users.push({ username: uname, pinHash: hashPin(uname, pin), role });
  writeFile(users);
  return { ok: true };
}

/** ลบผู้ใช้ (ห้ามลบ admin คนสุดท้าย) */
export function removeUser(username) {
  const uname = String(username || '').trim();
  const users = ensureSeed();
  const target = users.find((u) => u.username.toLowerCase() === uname.toLowerCase());
  if (!target) return { error: 'not_found' };
  const admins = users.filter((u) => u.role === 'admin');
  if (target.role === 'admin' && admins.length <= 1) return { error: 'last_admin' };
  writeFile(users.filter((u) => u.username.toLowerCase() !== uname.toLowerCase()));
  return { ok: true };
}
