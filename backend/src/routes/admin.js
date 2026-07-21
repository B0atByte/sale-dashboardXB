/**
 * admin.js — Admin Panel (เฉพาะ role=admin เท่านั้น — บังคับที่ server.js)
 *   แหล่งข้อมูล:
 *     GET  /api/admin/source        ดู URL ปัจจุบัน
 *     POST /api/admin/source        ตั้ง URL ใหม่ { url } (ตรวจว่าดึงได้จริงก่อนบันทึก)
 *   จัดการผู้ใช้:
 *     GET    /api/admin/users            รายชื่อผู้ใช้
 *     POST   /api/admin/users            เพิ่มผู้ใช้ { username, pin, role }
 *     DELETE /api/admin/users/:username  ลบผู้ใช้
 */
import { Router } from 'express';
import { getSourceInfo, setSheetUrl, isValidSheetUrl } from '../services/source.js';
import { clearCache, getSalesData } from '../services/sheets.js';
import { listUsers, addUser, removeUser } from '../services/users.js';
import { getAllTargets, setTarget } from '../services/targets.js';
import { getSettings, setSettings } from '../services/settings.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// ---------- แหล่งข้อมูล ----------
router.get('/admin/source', (_req, res) => {
  res.json(getSourceInfo());
});

router.post('/admin/source', asyncHandler(async (req, res) => {
  const url = String(req.body?.url || '').trim();
  if (!isValidSheetUrl(url)) {
    return res.status(400).json({ error: 'invalid_url' });
  }
  try {
    const test = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    if (!test.ok) return res.status(400).json({ error: 'fetch_failed', status: test.status });
    const text = await test.text();
    if (!text || text.trim().length < 10) return res.status(400).json({ error: 'empty_response' });
  } catch (err) {
    return res.status(400).json({ error: 'fetch_failed', detail: err.message.slice(0, 120) });
  }
  setSheetUrl(url);
  clearCache();
  try {
    await getSalesData({ force: true });
  } catch {
    /* ลองใหม่ตอน request ถัดไป */
  }
  res.json({ ok: true, ...getSourceInfo() });
}));

// ---------- จัดการผู้ใช้ ----------
router.get('/admin/users', (_req, res) => {
  res.json({ users: listUsers() });
});

router.post('/admin/users', (req, res) => {
  const { username, pin, role } = req.body || {};
  const r = addUser(username, pin, role);
  if (r.error) return res.status(400).json(r);
  res.json({ ok: true, users: listUsers() });
});

router.delete('/admin/users/:username', (req, res) => {
  const r = removeUser(req.params.username);
  if (r.error) return res.status(400).json(r);
  res.json({ ok: true, users: listUsers() });
});

// ---------- เป้ายอดขายรายเดือน ----------
router.get('/admin/targets', (_req, res) => {
  res.json({ targets: getAllTargets() });
});

router.post('/admin/targets', (req, res) => {
  const { month, amount } = req.body || {};
  const r = setTarget(month, amount);
  if (r.error) return res.status(400).json(r);
  res.json({ ok: true, targets: r.targets });
});

// ---------- ตั้งค่าระบบ ----------
router.get('/admin/settings', (_req, res) => {
  res.json(getSettings());
});

router.post('/admin/settings', (req, res) => {
  const next = setSettings(req.body || {});
  res.json({ ok: true, settings: next });
});

export default router;
