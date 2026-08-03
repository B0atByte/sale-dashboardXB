import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterByAccess, canSeeOverview, roleRank, canManageRole } from '../src/services/users.js';

const RECS = [
  { platform: 'Shopee' },
  { platform: 'stripe' },
  { platform: 'Central World Branch' },
  { platform: 'B2B' },
];

test('filterByAccess: ไม่มี access → เห็นทั้งหมด', () => {
  assert.equal(filterByAccess(RECS, null).length, 4);
  assert.equal(filterByAccess(RECS, {}).length, 4);
});

test('filterByAccess: allow (whitelist) case-insensitive', () => {
  const out = filterByAccess(RECS, { allow: ['Stripe'] }); // ชีตเก็บเป็น "stripe"
  assert.equal(out.length, 1);
  assert.equal(out[0].platform, 'stripe');
});

test('filterByAccess: deny (blacklist)', () => {
  const out = filterByAccess(RECS, { deny: ['Central World Branch'] });
  assert.equal(out.length, 3);
  assert.ok(!out.some((r) => r.platform === 'Central World Branch'));
});

test('canSeeOverview', () => {
  assert.equal(canSeeOverview(null), true);
  assert.equal(canSeeOverview({ overview: false }), false);
  assert.equal(canSeeOverview({ overview: true }), true);
  assert.equal(canSeeOverview({ allow: ['Stripe'] }), true); // ไม่มี key overview = default true
});

test('roleRank / canManageRole', () => {
  assert.ok(roleRank('itsupport') > roleRank('admin'));
  assert.ok(roleRank('admin') > roleRank('viewer'));
  assert.equal(canManageRole('admin', 'viewer'), true);
  assert.equal(canManageRole('viewer', 'admin'), false);
  assert.equal(canManageRole('itsupport', 'admin'), true);
  assert.equal(canManageRole('admin', 'itsupport'), false);
});
