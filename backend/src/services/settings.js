/**
 * settings.js — ตั้งค่าระบบที่ปรับได้ตอนรัน (เก็บใน data/settings.json)
 */
import { createStore } from './jsonStore.js';

const store = createStore('settings.json', {});

const DEFAULTS = {
  gmvField: 'lineTotal', // 'lineTotal' (ราคาขาย) | 'netRevenue' (รายรับสุทธิ)
  cacheTtlSeconds: 60, // อย่าตั้งต่ำเกินไป — Google Sheet export ช้า ~1-2 วิ/ครั้ง และอาจ throttle ถ้ายิงถี่
  refreshIntervalMs: 60000,
  brandTitle: 'xBloom Sale Dashboard',
  brandFooter: '© 2026 xBloomXCasalapin',
  showDemo: true,
};

export function getSettings() {
  try {
    const obj = store.read();
    return { ...DEFAULTS, ...(obj && typeof obj === 'object' ? obj : {}) };
  } catch (err) {
    console.error(`[settings] settings.json มีปัญหา ใช้ค่าเริ่มต้นชั่วคราว: ${err.message}`);
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

  store.write(next);
  return next;
}
