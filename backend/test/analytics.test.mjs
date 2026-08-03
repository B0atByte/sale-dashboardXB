import { test } from 'node:test';
import assert from 'node:assert/strict';
import { round2, bucketKeyOf, applyFilters, computeSummary } from '../src/services/analytics.js';

test('round2', () => {
  assert.equal(round2(10 / 3), 3.33);
  assert.equal(round2(2), 2);
});

test('bucketKeyOf: 4 กลุ่ม (tea มาก่อน)', () => {
  assert.equal(bucketKeyOf({ category: 'Tea' }), 'tea');
  assert.equal(bucketKeyOf({ productName: 'Green Tea Sachet' }), 'tea', 'tea ก่อน consumables');
  assert.equal(bucketKeyOf({ category: 'xBloom Studio' }), 'studio');
  assert.equal(bucketKeyOf({ productName: 'Coffee Beans 200g' }), 'consumables');
  assert.equal(bucketKeyOf({ category: 'Accessories' }), 'accessories');
});

const RECS = [
  { date: '2026-03-08', platform: 'Shopee', category: 'xBloom Studio', productName: 'Studio Midnight', campaign: 'LAUNCH', quantity: 2, lineTotal: 1000, gmv: 1000, netRevenue: 900, orderNo: 'A1', location: 'ออนไลน์' },
  { date: '2026-07-15', platform: 'stripe', category: 'Tea', productName: 'Green Tea Sachet', campaign: 'BAU', quantity: 1, lineTotal: 500, gmv: 500, netRevenue: 450, orderNo: 'A2', location: 'ออนไลน์' },
  { date: '2026-07-20', platform: 'Central World Branch', category: 'Accessories', productName: 'Cup', campaign: 'BAU', quantity: 3, lineTotal: 300, gmv: 300, netRevenue: 270, orderNo: 'A3', location: 'Central World Branch' },
];

test('applyFilters: platform case-insensitive', () => {
  assert.equal(applyFilters(RECS, { platform: 'shopee' }).length, 1);
  assert.equal(applyFilters(RECS, { platform: 'STRIPE' }).length, 1);
});

test('applyFilters: category=tea', () => {
  const out = applyFilters(RECS, { category: 'tea' });
  assert.equal(out.length, 1);
  assert.equal(out[0].productName, 'Green Tea Sachet');
});

test('applyFilters: date range + product substring', () => {
  assert.equal(applyFilters(RECS, { from: '2026-07-01', to: '2026-07-31' }).length, 2);
  assert.equal(applyFilters(RECS, { product: 'tea' }).length, 1);
});

test('computeSummary: KPI พื้นฐาน', () => {
  const s = computeSummary(RECS);
  assert.equal(s.kpi.totalGmv, 1800);
  assert.equal(s.kpi.totalUnits, 6);
  assert.equal(s.kpi.totalOrders, 3);
  assert.equal(s.kpi.totalNetRevenue, 1620);
  assert.equal(s.kpi.aiv, round2(1800 / 6)); // ต่อชิ้น
  assert.equal(s.byPlatform.length, 3);
  assert.equal(s.byPlatform[0].platform, 'Shopee'); // gmv สูงสุด
});
