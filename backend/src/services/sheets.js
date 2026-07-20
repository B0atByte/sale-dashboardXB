/**
 * sheets.js — ดึงข้อมูล CSV จาก Google Sheets พร้อม in-memory cache
 *
 * พฤติกรรม:
 * - cache มีอายุตาม CACHE_TTL_SECONDS (ค่าเริ่มต้น 300 วินาที)
 * - ระหว่างกำลัง refresh ถ้ามี request เข้ามาพร้อมกันหลายตัว จะแชร์ promise
 *   เดียวกัน (in-flight dedupe) ไม่ยิงซ้ำไปที่ Google Sheets
 * - ถ้าดึงจาก upstream ล้มเหลวแต่มี cache เก่า (stale) อยู่ ให้เสิร์ฟ cache เก่า
 *   พร้อม fromCache: true — ถ้าไม่มี cache เลยจะ throw SheetFetchError (-> 502)
 */
import config from '../config.js';
import { parseSheetCsv } from './parser.js';

/** error เฉพาะสำหรับกรณีดึงชีทไม่สำเร็จและไม่มี cache สำรอง */
export class SheetFetchError extends Error {
  constructor(cause) {
    super('sheet_fetch_failed');
    this.name = 'SheetFetchError';
    this.cause = cause;
  }
}

// สถานะ cache ภายใน module (in-memory)
let cache = null; // { records: [...], updatedAt: string(ISO), expiresAt: number(epoch ms) }
let inflight = null; // promise ของการ fetch ที่กำลังทำงานอยู่ (ถ้ามี)

/** ดึง CSV จาก Google Sheets แล้ว parse — อัปเดต cache เมื่อสำเร็จ */
async function refresh() {
  const res = await fetch(config.sheetCsvUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000), // กันค้างถ้า upstream ไม่ตอบ
  });
  if (!res.ok) {
    throw new Error(`upstream ตอบสถานะ ${res.status}`);
  }
  const csvText = await res.text();
  const records = parseSheetCsv(csvText);
  cache = {
    records,
    updatedAt: new Date().toISOString(),
    expiresAt: Date.now() + config.cacheTtlSeconds * 1000,
  };
  return cache;
}

/**
 * คืนข้อมูลยอดขายล่าสุด (จาก cache ถ้ายังไม่หมดอายุ)
 * - stale เป็น true เฉพาะกรณีดึง upstream ล้มเหลวแล้วต้องเสิร์ฟ cache เก่าแทน
 *   (cache hit ตามอายุ TTL ปกติถือว่าไม่ stale)
 * @param {{force?: boolean}} [opts] force=true บังคับดึงใหม่โดยข้ามแคช (ปุ่มรีเฟรชดึงสด)
 * @returns {Promise<{records: Array, updatedAt: string, fromCache: boolean, stale: boolean}>}
 */
export async function getSalesData({ force = false } = {}) {
  // 1) cache ยังไม่หมดอายุ และไม่ได้บังคับดึงสด -> ใช้ได้เลย
  if (!force && cache && Date.now() < cache.expiresAt) {
    return { records: cache.records, updatedAt: cache.updatedAt, fromCache: true, stale: false };
  }

  // 2) ต้อง refresh — แชร์ promise เดียวกันถ้ามีการ fetch ค้างอยู่แล้ว
  if (!inflight) {
    inflight = refresh().finally(() => {
      inflight = null;
    });
  }

  try {
    const fresh = await inflight;
    return { records: fresh.records, updatedAt: fresh.updatedAt, fromCache: false, stale: false };
  } catch (err) {
    // 3) fetch ล้มเหลว: ถ้ามี cache เก่าให้เสิร์ฟแทน (stale-while-error)
    if (cache) {
      console.warn(`[sheets] ดึงชีทไม่สำเร็จ ใช้ cache เดิมแทน: ${err.message}`);
      return { records: cache.records, updatedAt: cache.updatedAt, fromCache: true, stale: true };
    }
    throw new SheetFetchError(err);
  }
}
