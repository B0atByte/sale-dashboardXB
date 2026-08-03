/**
 * jsonStore.js — ชั้นเก็บข้อมูลกลาง (ตอนนี้ backed ด้วย SQLite ผ่าน node:sqlite)
 *
 * ทำไมเป็น SQLite (แทนไฟล์ JSON แยก): เขียนเป็น transaction atomic จริง (ไม่มีไฟล์ครึ่ง ๆ),
 * ทนไฟดับ, สำรอง/กู้คืนเป็นไฟล์เดียว (data/xbloom.db) — คง "สัญญา" เดิมของ createStore ไว้ครบ:
 *   - อ่าน: ไม่มีข้อมูล (และไม่มีไฟล์เดิม) → คืน fallback ; ข้อมูลเสีย (parse พัง) → โยน DataStoreError
 *   - เขียน: atomic (SQLite รับประกันเอง)
 * ผู้เรียก (users/settings/targets/source/activity) ใช้ create(...).read()/.write() เหมือนเดิมทุกอย่าง
 *
 * การย้ายข้อมูลเดิม (JSON → DB): ทำอัตโนมัติครั้งแรกที่อ่านแต่ละ key
 *   ไฟล์ data/<name>.json เดิมจะถูกอ่านเข้ามาแล้วเปลี่ยนชื่อเป็น .migrated (ไม่ลบ เผื่อ rollback)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'xbloom.db');

/** error เฉพาะกรณีข้อมูลอ่าน/parse ไม่ได้ (แยกจากกรณี "ยังไม่มีข้อมูล") */
export class DataStoreError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'DataStoreError';
    this.cause = cause;
  }
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

// เปิด DB เดียวใช้ร่วมกันทั้ง process
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('CREATE TABLE IF NOT EXISTS kv (name TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)');

const selStmt = db.prepare('SELECT value FROM kv WHERE name = ?');
const upStmt = db.prepare(
  'INSERT INTO kv (name, value, updated_at) VALUES (?, ?, ?) ' +
    'ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
);

/**
 * ย้ายไฟล์ JSON เดิม (data/<fileName>) เข้า DB — คืน object ที่ย้าย หรือ undefined ถ้าไม่มีไฟล์เดิม
 * ไฟล์เดิมเสีย (parse ไม่ได้) → โยน DataStoreError (fail closed เหมือนพฤติกรรมเดิม)
 */
function migrateLegacy(fileName) {
  const legacy = path.join(DATA_DIR, fileName);
  let raw;
  try {
    raw = fs.readFileSync(legacy, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return undefined;
    throw new DataStoreError(`อ่านไฟล์เดิมไม่ได้: ${fileName}`, err);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DataStoreError(`ไฟล์เดิมเสีย (parse ไม่ได้): ${fileName}`, err);
  }
  upStmt.run(fileName, JSON.stringify(parsed), new Date().toISOString());
  try {
    fs.renameSync(legacy, `${legacy}.migrated`); // กันย้ายซ้ำ ไม่ลบเผื่อ rollback
  } catch {
    /* ไม่เป็นไร — ครั้งหน้า kv มีแล้วจะไม่ย้ายซ้ำ */
  }
  return parsed;
}

/**
 * สร้าง store สำหรับ "หนึ่งชุดข้อมูล" (ชื่อเดิมเป็นชื่อไฟล์ เช่น 'users.json')
 * @param {string} fileName คีย์ของชุดข้อมูล (คงชื่อไฟล์เดิมไว้เพื่อความเข้ากันได้/การย้าย)
 * @param {*} fallback ค่าที่คืนเมื่อยังไม่มีข้อมูล (คนละกรณีกับข้อมูลเสีย)
 */
export function createStore(fileName, fallback) {
  return {
    file: DB_FILE,
    key: fileName,

    /** อ่าน: ไม่มีข้อมูล → (ย้ายจากไฟล์เดิมถ้ามี ไม่งั้น) fallback ; ข้อมูลเสีย → โยน DataStoreError */
    read() {
      const row = selStmt.get(fileName);
      if (row === undefined) {
        const migrated = migrateLegacy(fileName);
        return migrated === undefined ? clone(fallback) : migrated;
      }
      try {
        return JSON.parse(row.value);
      } catch (err) {
        throw new DataStoreError(`ข้อมูลใน DB เสีย (parse ไม่ได้): ${fileName}`, err);
      }
    },

    /** เขียนแบบ atomic (SQLite upsert) */
    write(value) {
      upStmt.run(fileName, JSON.stringify(value), new Date().toISOString());
      return value;
    },
  };
}

// ย้ายข้อมูลเดิมทั้งหมดตั้งแต่ตอนบูต (ให้ DB พร้อมทันที) — ไฟล์เสียก็ log แล้วไปต่อ
// (ผู้เรียกจะเจอ DataStoreError ตอน read จริงของ key นั้นเอง = fail closed เฉพาะจุด)
for (const f of ['users.json', 'settings.json', 'targets.json', 'source.json', 'sources.json', 'activity.json']) {
  try {
    if (selStmt.get(f) === undefined) migrateLegacy(f);
  } catch (err) {
    console.error(`[store] ย้ายข้อมูลเดิม ${f} ไม่สำเร็จ: ${err.message}`);
  }
}
