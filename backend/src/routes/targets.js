/**
 * targets.js — อ่านเป้ายอดขาย (ผู้ใช้ที่ล็อกอินทุกคนอ่านได้ เพื่อแสดงบนแดชบอร์ด)
 *   GET /api/targets  -> { targets: { "YYYY-MM": number } }
 * การตั้งเป้า (POST) อยู่ในเส้นทาง admin (เฉพาะ admin)
 */
import { Router } from 'express';
import { getAllTargets } from '../services/targets.js';

const router = Router();

router.get('/targets', (_req, res) => {
  res.json({ targets: getAllTargets() });
});

export default router;
