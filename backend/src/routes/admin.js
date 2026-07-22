/**
 * admin.js — Admin Panel (ต้องอย่างน้อย role=admin — บังคับที่ server.js)
 *   แหล่งข้อมูล (เฉพาะ itsupport):
 *     GET/POST /api/admin/source          ชีตหลัก
 *     GET/POST /api/admin/sources         ชีตเสริม (หลาย platform)
 *   จัดการผู้ใช้ (admin สร้างได้แค่ role ที่ไม่สูงกว่าตน; itsupport สร้าง/เห็นได้ทุก role):
 *     GET    /api/admin/users
 *     POST   /api/admin/users             { username, pin, role }
 *     DELETE /api/admin/users/:username
 *   เป้ายอดขาย / ตั้งค่าระบบ: admin ขึ้นไป
 *   Log กิจกรรม (เฉพาะ itsupport):
 *     GET    /api/admin/activity
 */
import { Router } from 'express';
import {
  getSourceInfo,
  setSheetUrl,
  isValidSheetUrl,
  getExtraSources,
  setExtraSources,
} from '../services/source.js';
import { clearCache, getSalesData } from '../services/sheets.js';
import { listUsers, addUser, removeUser, canManageRole } from '../services/users.js';
import { getAllTargets, setTarget } from '../services/targets.js';
import { getSettings, setSettings } from '../services/settings.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { revokeUserSessions, getUser, requireRole } from '../middleware/session.js';
import { logActivity, getActivity } from '../services/activity.js';

const router = Router();

/** ข้อมูลผู้กระทำ (actor/role/ip) สำหรับ log */
function actorOf(req) {
  const u = getUser(req) || {};
  return { actor: u.username || '-', role: u.role || '-', ip: req.ip || 'unknown' };
}

// ---------- แหล่งข้อมูล (เฉพาะ itsupport) ----------
router.get('/admin/source', requireRole('itsupport'), (_req, res) => {
  res.json(getSourceInfo());
});

router.post('/admin/source', requireRole('itsupport'), asyncHandler(async (req, res) => {
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
  logActivity({ type: 'source_change', ...actorOf(req), detail: 'แหล่งหลัก' });
  res.json({ ok: true, ...getSourceInfo() });
}));

// ---------- แหล่งข้อมูลเสริม (เฉพาะ itsupport) ----------
router.get('/admin/sources', requireRole('itsupport'), (_req, res) => {
  res.json({ sources: getExtraSources() });
});

router.post('/admin/sources', requireRole('itsupport'), asyncHandler(async (req, res) => {
  const list = Array.isArray(req.body?.sources) ? req.body.sources : [];
  const saved = setExtraSources(list);
  clearCache();
  try {
    await getSalesData({ force: true }); // ดึงใหม่รวมแหล่งเสริมทันที
  } catch {
    /* ลองใหม่ตอน request ถัดไป */
  }
  logActivity({ type: 'source_change', ...actorOf(req), detail: `ชีตเสริม ${saved.length} รายการ` });
  res.json({ ok: true, sources: saved });
}));

// ---------- จัดการผู้ใช้ ----------
router.get('/admin/users', (req, res) => {
  const { role } = getUser(req) || {};
  res.json({ users: listUsers(role) });
});

router.post('/admin/users', (req, res) => {
  const { role: callerRole } = getUser(req) || {};
  const { username, pin, role } = req.body || {};
  // admin สร้าง role ที่สูงกว่าตนไม่ได้ (เช่น admin สร้าง itsupport ไม่ได้)
  if (!canManageRole(callerRole, role)) return res.status(403).json({ error: 'forbidden_role' });
  const r = addUser(username, pin, role);
  if (r.error) return res.status(400).json(r);
  logActivity({ type: 'user_add', ...actorOf(req), detail: `${String(username || '').trim()} (${role})` });
  res.json({ ok: true, users: listUsers(callerRole) });
});

router.delete('/admin/users/:username', (req, res) => {
  const { role: callerRole } = getUser(req) || {};
  const r = removeUser(req.params.username, callerRole);
  if (r.error) return res.status(r.error === 'forbidden' ? 403 : 400).json(r);
  revokeUserSessions(req.params.username); // เตะ session ที่ยังค้างของผู้ใช้ที่ถูกลบทันที
  logActivity({ type: 'user_remove', ...actorOf(req), detail: req.params.username });
  res.json({ ok: true, users: listUsers(callerRole) });
});

// ---------- เป้ายอดขายรายเดือน ----------
router.get('/admin/targets', (_req, res) => {
  res.json({ targets: getAllTargets() });
});

router.post('/admin/targets', (req, res) => {
  const { month, amount } = req.body || {};
  const r = setTarget(month, amount);
  if (r.error) return res.status(400).json(r);
  logActivity({ type: 'target_change', ...actorOf(req), detail: `${month} = ${amount}` });
  res.json({ ok: true, targets: r.targets });
});

// ---------- ตั้งค่าระบบ ----------
router.get('/admin/settings', (_req, res) => {
  res.json(getSettings());
});

router.post('/admin/settings', (req, res) => {
  const next = setSettings(req.body || {});
  logActivity({ type: 'settings_change', ...actorOf(req), detail: Object.keys(req.body || {}).join(',') });
  res.json({ ok: true, settings: next });
});

// ---------- Log กิจกรรม (เฉพาะ itsupport) ----------
router.get('/admin/activity', requireRole('itsupport'), (req, res) => {
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 300));
  res.json({ activity: getActivity(limit) });
});

export default router;
