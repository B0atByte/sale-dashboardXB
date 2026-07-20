/**
 * targets.js — เก็บเป้ายอดขายรายเดือน ใน data/targets.json
 * รูปแบบ: { "YYYY-MM": จำนวนเงินเป้า }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'targets.json');

/** อ่านเป้าทั้งหมด */
export function getAllTargets() {
  try {
    const obj = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** ตั้งเป้าของเดือนหนึ่ง (YYYY-MM) */
export function setTarget(month, amount) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) return { error: 'invalid_month' };
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) return { error: 'invalid_amount' };
  const targets = getAllTargets();
  targets[month] = amt;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(targets, null, 2), 'utf8');
  return { ok: true, targets };
}
