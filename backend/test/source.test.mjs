import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsvExportUrl, isValidSheetUrl } from '../src/services/source.js';

test('toCsvExportUrl: ลิงก์ /edit → /export CSV', () => {
  assert.equal(
    toCsvExportUrl('https://docs.google.com/spreadsheets/d/ABC123/edit#gid=987'),
    'https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=987'
  );
});

test('toCsvExportUrl: ลิงก์ CSV อยู่แล้ว → คงเดิม', () => {
  const url = 'https://docs.google.com/spreadsheets/d/ABC/export?format=csv&gid=0';
  assert.equal(toCsvExportUrl(url), url);
});

test('toCsvExportUrl: ไม่มี gid → default gid=0', () => {
  assert.equal(
    toCsvExportUrl('https://docs.google.com/spreadsheets/d/XYZ/edit'),
    'https://docs.google.com/spreadsheets/d/XYZ/export?format=csv&gid=0'
  );
});

test('isValidSheetUrl: กัน SSRF/โฮสต์ปลอม', () => {
  assert.equal(isValidSheetUrl('https://docs.google.com/spreadsheets/d/ABC/edit'), true);
  assert.equal(isValidSheetUrl('https://docs.google.com.evil.com/spreadsheets/d/ABC'), false);
  assert.equal(isValidSheetUrl('http://docs.google.com/spreadsheets/d/ABC'), false); // ไม่ใช่ https
  assert.equal(isValidSheetUrl('https://evil.com/spreadsheets/'), false);
  assert.equal(isValidSheetUrl('ไม่ใช่ url'), false);
});
