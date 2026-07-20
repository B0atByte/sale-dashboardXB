/**
 * settings.js — อ่านค่าตั้งค่าระบบ (ผู้ใช้ที่ล็อกอินทุกคนอ่านได้ เพื่อให้ frontend ใช้)
 *   GET /api/settings
 * การแก้ไข (POST) อยู่ในเส้นทาง admin (เฉพาะ admin)
 */
import { Router } from 'express';
import { getSettings } from '../services/settings.js';

const router = Router();

router.get('/settings', (_req, res) => {
  res.json(getSettings());
});

export default router;
