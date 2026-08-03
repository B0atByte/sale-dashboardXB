import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNum, parseSheetCsv } from '../src/services/parser.js';

test('parseNum: ตัด comma/฿/% และค่าว่าง', () => {
  assert.equal(parseNum('22,900'), 22900);
  assert.equal(parseNum('฿1,000'), 1000);
  assert.equal(parseNum('12.5'), 12.5);
  assert.equal(parseNum('-500'), -500);
  assert.equal(parseNum(''), 0);
  assert.equal(parseNum('-'), 0);
  assert.equal(parseNum('abc'), 0);
  assert.equal(parseNum(null), 0);
});

const HEADER =
  '#,วันที่,แพลตฟอร์มขาย,ชื่อลูกค้า,จำนวน,ราคาสินค้าขาย,รายรับจากคำสั่งซื้อ,ราคาคีย์ VTEC,Day,Month,Year,Product Name,Categroy,Campaign';

const CSV = [
  'รายงานยอดขาย (แถวหัวเรื่อง)',
  'อัปเดตล่าสุด ...',
  ',,,',
  ',,,',
  HEADER,
  '1,3/8/2569,Shopee,Alice,2,"1,000",900,"1,100",8,3,2569,xBloom Studio Midnight,xBloom Studio,LAUNCH',
  '2,15/7/2026,stripe,Bob,1,500,450,520,15,7,2026,Green Tea Sachet,Tea,BAU',
  '3,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!,#REF!',
  ',,,,,,,,,,,,,',
].join('\n');

test('parseSheetCsv: หา header, สร้างวันที่, จับคอลัมน์, ข้าม #REF!/แถวว่าง', () => {
  const rows = parseSheetCsv(CSV);
  assert.equal(rows.length, 2, 'ต้องได้ 2 แถว (ข้าม #REF! และแถวว่าง)');

  const a = rows[0];
  assert.equal(a.date, '2026-03-08', 'พ.ศ. 2569 → ค.ศ. 2026 จาก Day/Month/Year');
  assert.equal(a.platform, 'Shopee');
  assert.equal(a.quantity, 2);
  assert.equal(a.lineTotal, 1000);
  assert.equal(a.netRevenue, 900);
  assert.equal(a.vtecPrice, 1100);
  assert.equal(a.category, 'xBloom Studio');
  assert.equal(a.productName, 'xBloom Studio Midnight');

  const b = rows[1];
  assert.equal(b.date, '2026-07-15');
  assert.equal(b.platform, 'stripe');
  assert.equal(b.category, 'Tea');
  assert.equal(b.vtecPrice, 520);
});

test('parseSheetCsv: ไม่พบ header → โยน error', () => {
  assert.throws(() => parseSheetCsv('a,b,c\n1,2,3'), /header/);
});
