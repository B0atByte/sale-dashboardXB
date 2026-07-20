/**
 * sales.js — เส้นทาง API สำหรับข้อมูลยอดขาย
 *   GET /api/sales          รายการขายทั้งหมด (กรองด้วย from / to / platform ได้)
 *   GET /api/sales/summary  สรุป KPI, สินค้าขายดี, ยอดตามแพลตฟอร์ม
 */
import { Router } from 'express';
import { getSalesData, SheetFetchError } from '../services/sheets.js';

const router = Router();

/** ปัดเศษเป็นทศนิยม 2 ตำแหน่ง (กัน floating point noise ในผลรวม) */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/** ลูกค้าขอข้อมูลสด (ข้ามแคช) เมื่อส่ง ?fresh=1 — ใช้กับปุ่มรีเฟรช */
function wantsFresh(req) {
  return req.query.fresh === '1' || req.query.fresh === 'true';
}

/**
 * กรอง records ตาม query string
 * - from / to: เทียบสตริงรูปแบบ YYYY-MM-DD แบบ inclusive
 * - platform: เทียบแบบ case-insensitive และ trim ช่องว่างทั้งสองฝั่ง
 */
function applyFilters(records, { from, to, platform }) {
  let out = records;
  if (from) out = out.filter((r) => r.date >= from);
  if (to) out = out.filter((r) => r.date <= to);
  if (platform) {
    const want = String(platform).trim().toLowerCase();
    out = out.filter((r) => r.platform.trim().toLowerCase() === want);
  }
  return out;
}

/** จัดการ error จาก service: ดึงชีทไม่ได้และไม่มี cache -> 502 */
function handleError(err, res) {
  if (err instanceof SheetFetchError) {
    return res.status(502).json({ error: 'sheet_fetch_failed' });
  }
  console.error('[sales] ข้อผิดพลาดไม่คาดคิด:', err);
  return res.status(500).json({ error: 'internal_error' });
}

// GET /api/sales — รายการขายตาม filter
router.get('/sales', async (req, res) => {
  try {
    const { records, updatedAt, fromCache, stale } = await getSalesData({ force: wantsFresh(req) });
    const filtered = applyFilters(records, req.query);
    res.json({ updatedAt, fromCache, stale, count: filtered.length, records: filtered });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/sales/summary — สรุปภาพรวม
router.get('/sales/summary', async (req, res) => {
  try {
    const { records, updatedAt, fromCache, stale } = await getSalesData({ force: wantsFresh(req) });
    const filtered = applyFilters(records, req.query);

    // ---- KPI รวม ----
    let totalGmv = 0;
    let totalUnits = 0;
    let totalNetRevenue = 0;
    const orderNos = new Set();

    // ---- ตัวรวมยอดรายสินค้าและรายแพลตฟอร์ม ----
    const byProduct = new Map(); // name -> { name, category, units, gmv }
    const byPlatformMap = new Map(); // platform -> { platform, gmv, units, orders:Set }

    for (const r of filtered) {
      totalGmv += r.lineTotal;
      totalUnits += r.quantity;
      totalNetRevenue += r.netRevenue;
      if (r.orderNo) orderNos.add(r.orderNo);

      // รวมยอดต่อสินค้า (ใช้ชื่อสินค้าเป็น key)
      const pKey = r.productName;
      if (!byProduct.has(pKey)) {
        byProduct.set(pKey, { name: r.productName, category: r.category, units: 0, gmv: 0 });
      }
      const p = byProduct.get(pKey);
      p.units += r.quantity;
      p.gmv += r.lineTotal;

      // รวมยอดต่อแพลตฟอร์ม
      const plKey = r.platform.trim();
      if (!byPlatformMap.has(plKey)) {
        byPlatformMap.set(plKey, { platform: plKey, gmv: 0, units: 0, orders: new Set() });
      }
      const pl = byPlatformMap.get(plKey);
      pl.gmv += r.lineTotal;
      pl.units += r.quantity;
      if (r.orderNo) pl.orders.add(r.orderNo);
    }

    const totalOrders = orderNos.size;

    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5)
      .map((p) => ({ ...p, units: round2(p.units), gmv: round2(p.gmv) }));

    const byPlatform = [...byPlatformMap.values()]
      .sort((a, b) => b.gmv - a.gmv)
      .map((pl) => ({
        platform: pl.platform,
        gmv: round2(pl.gmv),
        orders: pl.orders.size,
        units: round2(pl.units),
      }));

    res.json({
      updatedAt,
      fromCache,
      stale,
      kpi: {
        totalGmv: round2(totalGmv),
        totalOrders,
        totalUnits: round2(totalUnits),
        totalNetRevenue: round2(totalNetRevenue),
        aov: totalOrders > 0 ? round2(totalGmv / totalOrders) : 0,
      },
      topProducts,
      byPlatform,
    });
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
