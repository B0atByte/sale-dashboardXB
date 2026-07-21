/**
 * source.js — จัดการ "แหล่งข้อมูล" (URL ของ Google Sheets) แบบเปลี่ยนได้ตอนรัน
 * - ถ้าแอดมินตั้งค่าใหม่ผ่านหน้า Admin จะบันทึกลงไฟล์ data/source.json (คงอยู่แม้ restart)
 * - ถ้ายังไม่เคยตั้ง ใช้ค่า SHEET_CSV_URL จาก .env
 */
import config from '../config.js';
import { createStore } from './jsonStore.js';

const store = createStore('source.json', null);

/** อ่าน URL ที่แอดมินตั้งไว้ (ถ้ามี) — ไฟล์เสียให้ fallback ไป .env แต่ log ไว้ */
function readOverride() {
  try {
    const obj = store.read();
    return obj && typeof obj.url === 'string' && obj.url ? obj : null;
  } catch (err) {
    console.error(`[source] source.json มีปัญหา ใช้ค่าจาก .env ชั่วคราว: ${err.message}`);
    return null;
  }
}

/**
 * แปลงลิงก์ Google Sheets ให้เป็น URL ดึง CSV ได้เสมอ
 * - ลิงก์หน้าแก้ไขที่ copy จากเบราว์เซอร์ (…/d/<ID>/edit#gid=0) → …/d/<ID>/export?format=csv&gid=0
 * - ลิงก์ที่เป็น CSV อยู่แล้ว (มี /export, /pub, output=csv, format=csv) → คงไว้ตามเดิม
 */
export function toCsvExportUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  // เป็น endpoint CSV อยู่แล้ว (publish-to-web หรือ export ตรง ๆ) — ไม่ต้องแปลง
  if (/\/export\b/.test(s) || /\/pub\b/.test(s) || /output=csv/.test(s) || /format=csv/.test(s)) {
    return s;
  }
  // ลิงก์ชีตแบบแก้ไขปกติ: …/spreadsheets/d/<ID>/edit?gid=<gid>#gid=<gid>
  const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/);
  if (!idMatch) return s;
  const gidMatch = s.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

/** URL ที่ใช้ดึงข้อมูลจริง (override ก่อน, ไม่งั้นใช้จาก .env) — แปลงเป็น CSV เสมอ */
export function getSheetUrl() {
  const o = readOverride();
  return toCsvExportUrl(o ? o.url : config.sheetCsvUrl);
}

/** กำลังใช้ค่าที่แอดมินตั้งเอง (custom) หรือค่าจาก .env */
export function getSourceInfo() {
  const o = readOverride();
  return {
    url: toCsvExportUrl(o ? o.url : config.sheetCsvUrl),
    isCustom: Boolean(o),
    updatedAt: o?.updatedAt || null,
  };
}

/**
 * ตรวจว่าเป็น URL ของ Google Sheets ที่พอรับได้ (กัน SSRF)
 * ใช้ new URL() parse จริงแล้วเทียบ hostname แบบตรงตัว — กัน bypass เช่น
 * docs.google.com.evil.com หรือ user@docs.google.com ที่ regex เดิมอาจพลาด
 */
export function isValidSheetUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    return (
      u.protocol === 'https:' &&
      u.hostname === 'docs.google.com' &&
      u.pathname.startsWith('/spreadsheets/')
    );
  } catch {
    return false;
  }
}

/** ตั้งค่า URL ใหม่ (บันทึกลงไฟล์) — เก็บเป็นรูปแบบ CSV ที่ดึงได้จริง */
export function setSheetUrl(url) {
  const clean = toCsvExportUrl(String(url).trim());
  store.write({ url: clean, updatedAt: new Date().toISOString() });
  return clean;
}
