/**
 * users.js — จัดการผู้ใช้ (username + PIN + role) เก็บใน data/users.json
 * - PIN เก็บเป็น hash (scrypt + salt ต่อผู้ใช้ + pepper) ไม่เก็บ plaintext; hash เก่าแบบ sha256 อัปเกรดอัตโนมัติตอน login
 * - ถ้ายังไม่มีไฟล์ผู้ใช้ จะสร้าง admin เริ่มต้น (PIN = ACCESS_CODE จาก .env, สำรอง 1234)
 */
import crypto from 'node:crypto';
import config from '../config.js';
import { createStore, DataStoreError } from './jsonStore.js';

const store = createStore('users.json', null); // ไม่มีไฟล์ → null (กรณี seed ครั้งแรก)

export const ROLES = ['itsupport', 'admin', 'viewer'];
const ROLE_RANK = { viewer: 1, admin: 2, itsupport: 3 };

/** ระดับสิทธิ์ของ role (ยิ่งมากยิ่งสูง) */
export function roleRank(role) {
  return ROLE_RANK[role] || 0;
}
/** caller จัดการ/เห็น target role ได้ไหม — จัดการได้เฉพาะ role ที่ rank ไม่สูงกว่าตัวเอง */
export function canManageRole(callerRole, targetRole) {
  return roleRank(targetRole) > 0 && roleRank(callerRole) >= roleRank(targetRole);
}

// ---------- การ hash PIN ----------
// ใหม่: scrypt (memory-hard) + salt สุ่มต่อผู้ใช้ + pepper แยก → "scrypt$<saltHex>$<hashHex>"
// เก่า (legacy): sha256(username:pin:API_KEY) เป็น hex 64 ตัว — ยัง verify ได้ แล้วอัปเกรดอัตโนมัติ
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

function newPepper() {
  return config.pinPepper || 'xbloom-static-pepper';
}
function legacyPepper() {
  return config.apiKey || 'xbloom-static-pepper';
}

/** hash แบบใหม่ (scrypt) จาก pin + salt (hex) → คืน hex */
function scryptHex(pin, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto
    .scryptSync(`${String(pin)}:${newPepper()}`, salt, SCRYPT.keylen, {
      N: SCRYPT.N,
      r: SCRYPT.r,
      p: SCRYPT.p,
    })
    .toString('hex');
}
/** สร้าง pinHash รูปแบบใหม่ (มี salt สุ่มในตัว) */
function makeHash(pin) {
  const saltHex = crypto.randomBytes(16).toString('hex');
  return `scrypt$${saltHex}$${scryptHex(pin, saltHex)}`;
}
/** hash เก่าแบบ sha256 (ใช้แค่ตอน verify hash เดิมที่ยังไม่อัปเกรด) */
function legacyHex(username, pin) {
  return crypto
    .createHash('sha256')
    .update(`${String(username).toLowerCase()}:${String(pin)}:${legacyPepper()}`)
    .digest('hex');
}
function timingEqHex(aHex, bHex) {
  const a = Buffer.from(String(aHex), 'hex');
  const b = Buffer.from(String(bHex), 'hex');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
/** ตรวจ pin กับ hash ที่เก็บไว้ (รองรับทั้ง scrypt ใหม่ + sha256 เก่า) */
function verifyHash(username, pin, stored) {
  const s = String(stored || '');
  if (s.startsWith('scrypt$')) {
    const parts = s.split('$');
    if (parts.length !== 3 || !parts[1] || !parts[2]) return false;
    return timingEqHex(scryptHex(pin, parts[1]), parts[2]);
  }
  return timingEqHex(legacyHex(username, pin), s);
}

/**
 * โหลดผู้ใช้ทั้งหมด — สร้าง admin เริ่มต้น "เฉพาะเมื่อไฟล์ยังไม่มีจริง ๆ"
 * ถ้าไฟล์เสีย/อ่านไม่ได้ store.read() จะโยน error → ไม่ seed ทับ (กันข้อมูลผู้ใช้หาย)
 */
function ensureSeed() {
  const data = store.read(); // ไม่มีไฟล์ → null ; ไฟล์เสีย → throw DataStoreError
  if (data !== null && !Array.isArray(data)) {
    // มีไฟล์แต่รูปแบบผิด (ไม่ใช่ array) — ถือว่าเสีย ห้ามเขียนทับ ให้ล้มแบบดังเพื่อให้คนแก้
    throw new DataStoreError('users.json รูปแบบไม่ถูกต้อง (ต้องเป็น array)');
  }
  let users = data;
  if (users === null || users.length === 0) {
    const pin = config.accessCode || '1234';
    users = [{ username: 'admin', pinHash: makeHash(pin), role: 'admin' }];
    store.write(users);
  }
  // seed role itsupport (ลับ) ถ้าตั้ง IT_ACCESS_CODE ไว้และยังไม่มี — สร้าง/กู้คืนอัตโนมัติ
  if (config.itAccessCode && !users.some((u) => u.role === 'itsupport')) {
    users = [...users, { username: 'itsupport', pinHash: makeHash(config.itAccessCode), role: 'itsupport' }];
    store.write(users);
  }
  return users;
}

/** รายชื่อผู้ใช้ (ไม่รวม hash) — กรองตามสิทธิ์ผู้เรียก (เห็นได้เฉพาะ role ที่ rank ไม่สูงกว่าตน) */
export function listUsers(callerRole) {
  const rank = roleRank(callerRole);
  return ensureSeed()
    .filter((u) => rank > 0 && roleRank(u.role) <= rank)
    .map((u) => ({ username: u.username, role: u.role }));
}

/** ตรวจ username + PIN → คืน {username, role} หรือ null (อัปเกรด hash เก่า→scrypt อัตโนมัติเมื่อผ่าน) */
export function verifyUser(username, pin) {
  const users = ensureSeed();
  const uname = String(username || '').trim();
  const idx = users.findIndex((x) => x.username.toLowerCase() === uname.toLowerCase());
  if (idx === -1) return null;
  const u = users[idx];
  if (!verifyHash(u.username, String(pin || ''), u.pinHash)) return null;
  // อัปเกรด hash เก่า (sha256) เป็น scrypt แบบเงียบ ๆ หลัง login สำเร็จ
  if (!String(u.pinHash).startsWith('scrypt$')) {
    users[idx] = { ...u, pinHash: makeHash(String(pin || '')) };
    try {
      store.write(users);
    } catch {
      /* อัปเกรดครั้งหน้า */
    }
  }
  return { username: u.username, role: u.role };
}

/** เพิ่มผู้ใช้ใหม่ */
export function addUser(username, pin, role) {
  const uname = String(username || '').trim();
  if (!uname || !/^[a-zA-Z0-9_.\- ]{2,20}$/.test(uname)) return { error: 'invalid_username' };
  if (!/^\d{4,12}$/.test(String(pin || ''))) return { error: 'invalid_pin' };
  if (!ROLES.includes(role)) return { error: 'invalid_role' };
  const users = ensureSeed();
  if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
    return { error: 'duplicate' };
  }
  users.push({ username: uname, pinHash: makeHash(pin), role });
  store.write(users);
  return { ok: true };
}

/** ลบผู้ใช้ (ห้ามลบ admin คนสุดท้าย + จัดการได้เฉพาะ role ที่ไม่สูงกว่าตน) */
export function removeUser(username, callerRole) {
  const uname = String(username || '').trim();
  const users = ensureSeed();
  const target = users.find((u) => u.username.toLowerCase() === uname.toLowerCase());
  if (!target) return { error: 'not_found' };
  if (callerRole && !canManageRole(callerRole, target.role)) return { error: 'forbidden' };
  const admins = users.filter((u) => u.role === 'admin');
  if (target.role === 'admin' && admins.length <= 1) return { error: 'last_admin' };
  store.write(users.filter((u) => u.username.toLowerCase() !== uname.toLowerCase()));
  return { ok: true };
}
