/**
 * parser.js — แปลง CSV จาก Google Sheets ให้เป็น records ตามรูปแบบมาตรฐานของ API
 *
 * โครงสร้างชีท (ground truth จากชีทจริง):
 * - 4 แถวแรกเป็นหัวเรื่อง/แถวขยะ แถว header จริงคือแถวที่มีทั้ง "วันที่" และ "แพลตฟอร์มขาย"
 * - คอลัมน์ "Product ID" ปรากฏ 2 ครั้ง: ครั้งแรกเป็นข้อมูลดิบ ครั้งหลัง (ท้ายแถว) เป็น
 *   helper block ที่ normalize แล้ว (Note, Day, Month, Year, Product ID, Product Name,
 *   Categroy, Campaign) — ให้ใช้ block ท้ายเป็นหลัก
 * - "Categroy" คือการสะกดจริงในชีท (typo) แต่รองรับ "Category" เป็น fallback ด้วย
 * - ตัวเลขมาเป็นสตริง เช่น "22,900" อาจมี ฿ / % / ช่องว่างปน
 * - มีแถวว่างและแถว #REF! ต่อท้ายจำนวนมาก ต้องข้ามทิ้ง
 */
import { parse } from 'csv-parse/sync';

/** คอลัมน์ที่ต้องใช้ตำแหน่ง "ท้ายสุด" (helper block ที่ normalize แล้ว) */
const LAST_WINS = new Set([
  'Product ID',
  'Product Name',
  'Categroy',
  'Category',
  'Campaign',
  'Day',
  'Month',
  'Year',
  'Note',
]);

/** normalize ชื่อ header: ยุบ whitespace (รวม newline ที่ฝังใน cell) เหลือช่องว่างเดียว */
function normalizeHeader(cell) {
  return String(cell ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * แปลงสตริงตัวเลขจากชีทเป็น number
 * ตัด comma คั่นหลักพัน, สัญลักษณ์ ฿, %, และช่องว่างทิ้ง — ค่าว่าง/แปลงไม่ได้ -> 0
 */
export function parseNum(value) {
  const cleaned = String(value ?? '').replace(/[,฿%\s]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** เติมศูนย์นำหน้าให้ครบ 2 หลัก */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/** แปลงปี พ.ศ. เป็น ค.ศ. ถ้าจำเป็น (ปี > 2400 ถือว่าเป็นพุทธศักราช) */
function toGregorianYear(year) {
  return year > 2400 ? year - 543 : year;
}

/** ตรวจว่า ปี/เดือน/วัน สมเหตุสมผล (กันวันที่เพี้ยนหลุดไปโชว์บนกราฟ เช่น 2026-23-07) */
function validYmd(y, m, d) {
  return (
    Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d) &&
    y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31
  );
}

/**
 * สร้างวันที่ YYYY-MM-DD จากคอลัมน์ helper Day/Month/Year
 * ถ้าไม่ครบ/ไม่ถูกต้อง ให้ fallback ไป parse คอลัมน์ "วันที่"
 * รองรับทั้ง d/m/yyyy และ m/d/yyyy (บางชีตสาขาใช้ m/d) — สลับให้ถ้าเดือนเกิน 12
 * ถ้ายังไม่ถูกต้องคืนค่าว่าง (แถวนั้นจะไม่ถูกนำไปคิดตามวันที่)
 */
function buildDate(dayStr, monthStr, yearStr, rawDateStr) {
  const d = parseInt(dayStr, 10);
  const m = parseInt(monthStr, 10);
  const y = toGregorianYear(parseInt(yearStr, 10));
  if (validYmd(y, m, d)) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  const match = String(rawDateStr ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    let dd = parseInt(match[1], 10);
    let mm = parseInt(match[2], 10);
    const yy = toGregorianYear(parseInt(match[3], 10));
    if (mm > 12 && dd <= 12) [dd, mm] = [mm, dd]; // ชีตที่เขียนเป็น m/d/yyyy
    if (validYmd(yy, mm, dd)) return `${yy}-${pad2(mm)}-${pad2(dd)}`;
  }
  return '';
}

/**
 * หาแถว header จริง: สแกน ~15 แถวแรก หาแถวที่มีทั้ง "วันที่" และ "แพลตฟอร์มขาย"
 * @returns index ของแถว header หรือ -1 ถ้าไม่พบ
 */
function findHeaderRow(rows) {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map(normalizeHeader);
    if (cells.includes('วันที่') && cells.includes('แพลตฟอร์มขาย')) return i;
  }
  return -1;
}

/**
 * สร้าง map ชื่อคอลัมน์ -> index
 * ชื่อซ้ำ: คอลัมน์ใน LAST_WINS ใช้ตำแหน่งท้ายสุด นอกนั้นใช้ตำแหน่งแรก
 */
function buildColumnMap(headerRow) {
  const map = {};
  headerRow.forEach((cell, idx) => {
    const name = normalizeHeader(cell);
    if (!name) return;
    if (LAST_WINS.has(name) || !(name in map)) {
      map[name] = idx;
    }
  });
  return map;
}

/**
 * แปลงข้อความ CSV ทั้งไฟล์เป็น array ของ sales records
 * @param {string} csvText เนื้อหา CSV ดิบจาก Google Sheets
 * @returns {Array<object>} records ตาม contract ของ API
 */
export function parseSheetCsv(csvText) {
  const rows = parse(csvText, {
    relax_column_count: true,
    bom: true,
    skip_empty_lines: false,
  });

  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) {
    throw new Error('parser: ไม่พบแถว header (ต้องมีคอลัมน์ "วันที่" และ "แพลตฟอร์มขาย")');
  }

  const col = buildColumnMap(rows[headerIdx]);
  /** อ่านค่า cell ตามชื่อคอลัมน์ (trim แล้ว) — คืน '' ถ้าไม่มีคอลัมน์นั้น */
  const cellOf = (row, name) => {
    const idx = col[name];
    return idx === undefined ? '' : String(row[idx] ?? '').trim();
  };

  const records = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];

    // ข้ามแถวว่างทั้งแถว และแถวที่มี #REF! (แถวสูตรพังต่อท้ายชีท)
    if (row.every((c) => String(c ?? '').trim() === '')) continue;
    if (row.some((c) => String(c ?? '').includes('#REF!'))) continue;

    const date = buildDate(
      cellOf(row, 'Day'),
      cellOf(row, 'Month'),
      cellOf(row, 'Year'),
      cellOf(row, 'วันที่')
    );

    const productName = cellOf(row, 'Product Name') || cellOf(row, 'สินค้า');

    // ข้ามแถวที่ไม่มีทั้งวันที่และชื่อสินค้า (ไม่ใช่รายการขายจริง)
    if (!date && !productName) continue;

    // orderNo: ใช้หมายเลขคำสั่งซื้อ ถ้าว่างหรือเป็น "-" ให้ใช้เลขที่ใบเสร็จ (VTEC) แทน
    let orderNo = cellOf(row, 'หมายเลขคำสั่งซื้อ / INV');
    if (!orderNo || orderNo === '-') {
      orderNo = cellOf(row, 'เลขที่ใบเสร็จ (VTEC)');
    }

    // category: ใช้ helper "Categroy" (สะกดตามชีทจริง) fallback เป็น "Category"
    // ถ้ายังว่างให้ใช้ชื่อสินค้าแทน
    const category =
      cellOf(row, 'Categroy') || cellOf(row, 'Category') || productName;

    records.push({
      id: `${i}-${orderNo}`,
      date,
      platform: cellOf(row, 'แพลตฟอร์มขาย'),
      customer: cellOf(row, 'ชื่อลูกค้า'),
      orderNo,
      productName,
      productId: cellOf(row, 'Product ID') || cellOf(row, 'รหัสสินค้า (S/N) (CODE)'),
      category,
      campaign: cellOf(row, 'Campaign') || 'BAU',
      quantity: parseNum(cellOf(row, 'จำนวน')),
      lineTotal: parseNum(cellOf(row, 'ราคาสินค้าขาย')),
      netRevenue: parseNum(cellOf(row, 'รายรับจากคำสั่งซื้อ')),
      vtecPrice: parseNum(cellOf(row, 'ราคาคีย์ VTEC')),
    });
  }

  return records;
}
