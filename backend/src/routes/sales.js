/**
 * sales.js — เส้นทาง API สำหรับข้อมูลยอดขาย
 *   GET /api/sales          รายการขายทั้งหมด (กรอง from/to/platform/category/campaign/product)
 *   GET /api/sales/summary  สรุป KPI (มี aov + aiv), สินค้าขายดี, ยอดตามแพลตฟอร์ม, รายชื่อแคมเปญ
 */
import { Router } from 'express';
import { getSalesData, SheetFetchError } from '../services/sheets.js';
import { applyFilters, computeSummary } from '../services/analytics.js';
import { getSettings } from '../services/settings.js';

const router = Router();

/** ใส่ฟิลด์ gmv ให้แต่ละแถวตามตั้งค่า (ราคาขาย หรือ รายรับสุทธิ) */
function withGmv(records) {
  const field = getSettings().gmvField;
  return records.map((r) => ({ ...r, gmv: r[field] ?? r.lineTotal }));
}

/** ลูกค้าขอข้อมูลสด (ข้ามแคช) เมื่อส่ง ?fresh=1 */
function wantsFresh(req) {
  return req.query.fresh === '1' || req.query.fresh === 'true';
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
    const filtered = withGmv(applyFilters(records, req.query));
    res.json({ updatedAt, fromCache, stale, count: filtered.length, records: filtered });
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/sales/summary — สรุปภาพรวม
router.get('/sales/summary', async (req, res) => {
  try {
    const { records, updatedAt, fromCache, stale } = await getSalesData({ force: wantsFresh(req) });
    const filtered = withGmv(applyFilters(records, req.query));
    const summary = computeSummary(filtered);
    res.json({ updatedAt, fromCache, stale, ...summary });
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
