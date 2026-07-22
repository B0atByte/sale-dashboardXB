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
import { parseSheetCsv } from './parser.js';
import { getSheetUrl, getExtraSources } from './source.js';
import { getSettings } from './settings.js';

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

/** ล้าง cache (ใช้ตอนแอดมินเปลี่ยนแหล่งข้อมูล) */
export function clearCache() {
  cache = null;
  inflight = null;
}

/** ดึง CSV ดิบจาก URL เดียว (กันค้างด้วย timeout) */
async function fetchCsv(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`upstream ตอบสถานะ ${res.status}`);
  return res.text();
}

/**
 * ดึง + parse แหล่งหลัก แล้วรวมกับแหล่งข้อมูลเสริม (แต่ละชีต = 1 platform) — อัปเดต cache
 * - แหล่งหลักพัง = โยน error (เหมือนเดิม); แหล่งเสริมพังตัวใดตัวหนึ่ง = ข้ามไป ไม่ทำทั้งระบบล่ม
 */
async function refresh() {
  const records = parseSheetCsv(await fetchCsv(getSheetUrl()));

  for (const src of getExtraSources()) {
    try {
      const extra = parseSheetCsv(await fetchCsv(src.url));
      const tag = src.platform || '';
      for (const r of extra) {
        if (tag) r.platform = tag; // แปะ platform ของชีตนี้ (แบบ B: ทั้งชีต = platform เดียว)
        r.id = `${tag || 'x'}-${r.id}`; // กัน id ชนกับแหล่งหลัก/ชีตอื่น
        records.push(r);
      }
    } catch (err) {
      console.warn(`[sheets] แหล่งเสริมโหลดไม่ได้ (${src.platform || src.url}): ${err.message}`);
    }
  }

  cache = {
    records,
    updatedAt: new Date().toISOString(),
    expiresAt: Date.now() + getSettings().cacheTtlSeconds * 1000,
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
