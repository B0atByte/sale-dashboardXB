/**
 * targets.js — เก็บเป้ายอดขายรายเดือน ใน data/targets.json
 * รูปแบบ: { "YYYY-MM": จำนวนเงินเป้า }
 */
import { createStore } from './jsonStore.js';

const store = createStore('targets.json', {});

/** อ่านเป้าทั้งหมด */
export function getAllTargets() {
  try {
    const obj = store.read();
    return obj && typeof obj === 'object' ? obj : {};
  } catch (err) {
    console.error(`[targets] targets.json มีปัญหา ใช้ค่าว่างชั่วคราว: ${err.message}`);
    return {};
  }
}

/** ตั้งเป้าของเดือนหนึ่ง (YYYY-MM) */
export function setTarget(month, amount) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) return { error: 'invalid_month' };
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) return { error: 'invalid_amount' };
  // อ่านแบบให้ error เด้ง (store.read throw ถ้าไฟล์เสีย) เพื่อ abort การเขียน —
  // ไม่ให้เขียนทับด้วย {} ตอนไฟล์เสียชั่วคราว (กันเป้าเดือนอื่นหายทั้งหมด)
  const current = store.read();
  const targets = current && typeof current === 'object' ? current : {};
  targets[month] = amt;
  store.write(targets);
  return { ok: true, targets };
}
