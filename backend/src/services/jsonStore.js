/**
 * jsonStore.js — ชั้นเก็บข้อมูล JSON กลาง (แทน read/writeFileSync ที่เคยกระจายอยู่ 4 service)
 *
 * หลักการความปลอดภัยของข้อมูล:
 * - อ่าน: ไฟล์ยังไม่มี (ENOENT) → คืนค่า fallback ; ไฟล์ "เสีย" (parse พัง / EIO / EACCES) → โยน error
 *   ห้ามกลืน error เงียบ ๆ แล้วคืน "ว่าง" เพราะจะทำให้ผู้เรียกเข้าใจผิดว่า "ยังไม่มีข้อมูล"
 *   แล้วเขียนทับของจริงทิ้ง (เคยเป็นบั๊กที่ users ถูกลบทั้งตารางเมื่อไฟล์เสียชั่วคราว)
 * - เขียน: เขียนลงไฟล์ชั่วคราวก่อนแล้ว rename ทับ (atomic) — ถ้า process ถูก kill
 *   กลางการเขียน (deploy / OOM / ไฟดับ) ไฟล์เดิมยังอยู่ครบ ไม่เหลือไฟล์ครึ่ง ๆ กลาง ๆ
 *
 * หมายเหตุ: การเขียนทั้งหมดในโปรเจกต์นี้เป็นแบบ synchronous ภายใน process เดียว
 * จึงไม่มีการ interleave กันเอง (ไม่มี lost update ในเครื่องเดียว). การล็อกข้าม process
 * (สำหรับหลาย replica) เป็นงานของเฟส Redis/DB ในอนาคต
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

/** error เฉพาะกรณีไฟล์ข้อมูลอ่าน/parse ไม่ได้ (แยกจากกรณี "ไฟล์ยังไม่มี") */
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

/**
 * สร้าง store สำหรับไฟล์ JSON หนึ่งไฟล์ในโฟลเดอร์ data/
 * @param {string} fileName เช่น 'users.json'
 * @param {*} fallback ค่าที่คืนเมื่อ "ไฟล์ยังไม่มี" (คนละกรณีกับไฟล์เสีย)
 */
export function createStore(fileName, fallback) {
  const FILE = path.join(DATA_DIR, fileName);
  return {
    file: FILE,

    /** อ่าน: ไม่มีไฟล์ → fallback ; ไฟล์เสีย → โยน DataStoreError */
    read() {
      let raw;
      try {
        raw = fs.readFileSync(FILE, 'utf8');
      } catch (err) {
        if (err && err.code === 'ENOENT') return clone(fallback);
        throw new DataStoreError(`อ่านไฟล์ข้อมูลไม่ได้: ${fileName}`, err);
      }
      try {
        return JSON.parse(raw);
      } catch (err) {
        throw new DataStoreError(`ไฟล์ข้อมูลเสีย (parse ไม่ได้): ${fileName}`, err);
      }
    },

    /** เขียนแบบ atomic: เขียนไฟล์ชั่วคราวก่อนแล้ว rename ทับ */
    write(value) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
      fs.renameSync(tmp, FILE);
      return value;
    },
  };
}
