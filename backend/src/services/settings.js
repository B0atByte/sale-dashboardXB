/**
 * settings.js — ตั้งค่าระบบที่ปรับได้ตอนรัน (เก็บใน data/settings.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULTS = {
  gmvField: 'lineTotal', // 'lineTotal' (ราคาขาย) | 'netRevenue' (รายรับสุทธิ)
  cacheTtlSeconds: 15,
  refreshIntervalMs: 20000,
  brandTitle: 'xBloom Sale Dashboard',
  brandFooter: '© 2026 xBloomXCasalapin',
  showDemo: true,
};

export function getSettings() {
  try {
    const obj = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...DEFAULTS, ...(obj && typeof obj === 'object' ? obj : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

/** อัปเดตเฉพาะฟิลด์ที่ส่งมา (validate ก่อน) */
export function setSettings(patch = {}) {
  const next = getSettings();

  if (patch.gmvField === 'lineTotal' || patch.gmvField === 'netRevenue') {
    next.gmvField = patch.gmvField;
  }
  if (patch.cacheTtlSeconds !== undefined && Number.isFinite(Number(patch.cacheTtlSeconds))) {
    next.cacheTtlSeconds = Math.max(5, Math.min(3600, Math.round(Number(patch.cacheTtlSeconds))));
  }
  if (patch.refreshIntervalMs !== undefined && Number.isFinite(Number(patch.refreshIntervalMs))) {
    next.refreshIntervalMs = Math.max(5000, Math.min(600000, Math.round(Number(patch.refreshIntervalMs))));
  }
  if (typeof patch.brandTitle === 'string') {
    next.brandTitle = patch.brandTitle.trim().slice(0, 60) || DEFAULTS.brandTitle;
  }
  if (typeof patch.brandFooter === 'string') {
    next.brandFooter = patch.brandFooter.slice(0, 120);
  }
  if (typeof patch.showDemo === 'boolean') {
    next.showDemo = patch.showDemo;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
