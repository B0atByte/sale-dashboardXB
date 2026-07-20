/**
 * analytics.js — ตรรกะกรอง + คำนวณสรุปยอดขาย (ใช้ร่วมกันระหว่าง sales.js และ ai.js)
 */

/** ปัดเศษทศนิยม 2 ตำแหน่ง */
export function round2(n) {
  return Math.round(n * 100) / 100;
}

/** จัดหมวดสินค้าเป็นคีย์ 1 ใน 3 กลุ่ม (ตรงกับฝั่ง frontend) */
export function bucketKeyOf(record) {
  const text = `${record.productName || ''} ${record.category || ''}`.toLowerCase();
  if (
    text.includes('midnight black') ||
    text.includes('moonlight white') ||
    text.includes('sage green') ||
    text.includes('twilight') ||
    text.includes('studio')
  ) {
    return 'studio';
  }
  if (
    text.includes('xpod') ||
    text.includes('bean') ||
    text.includes('sachet') ||
    text.includes('เมล็ด')
  ) {
    return 'consumables';
  }
  return 'accessories';
}

/**
 * กรอง records ตาม query:
 * - from / to: เทียบสตริง YYYY-MM-DD แบบ inclusive
 * - platform: เทียบ case-insensitive + trim
 * - category: คีย์กลุ่ม (studio / consumables / accessories)
 * - campaign: เทียบ case-insensitive + trim
 * - product: ค้นหาชื่อสินค้าแบบ substring (case-insensitive)
 */
export function applyFilters(records, { from, to, platform, category, campaign, product } = {}) {
  let out = records;
  if (from) out = out.filter((r) => r.date >= from);
  if (to) out = out.filter((r) => r.date <= to);
  if (platform) {
    const want = String(platform).trim().toLowerCase();
    out = out.filter((r) => r.platform.trim().toLowerCase() === want);
  }
  if (category) {
    const want = String(category).trim().toLowerCase();
    out = out.filter((r) => bucketKeyOf(r) === want);
  }
  if (campaign) {
    const want = String(campaign).trim().toLowerCase();
    out = out.filter((r) => String(r.campaign || '').trim().toLowerCase() === want);
  }
  if (product) {
    const want = String(product).trim().toLowerCase();
    if (want) out = out.filter((r) => String(r.productName || '').toLowerCase().includes(want));
  }
  return out;
}

/**
 * คำนวณสรุป KPI + สินค้าขายดี + ยอดตามแพลตฟอร์ม + รายชื่อแคมเปญ
 * kpi.aov = GMV / ออเดอร์ (ต่อออเดอร์) , kpi.aiv = GMV / ชิ้น (ต่อชิ้น)
 */
export function computeSummary(records) {
  let totalGmv = 0;
  let totalUnits = 0;
  let totalNetRevenue = 0;
  const orderNos = new Set();
  const byProduct = new Map();
  const byPlatformMap = new Map();
  const campaignSet = new Set();

  for (const r of records) {
    // "ยอดขาย" อ้างอิงฟิลด์ gmv ที่ route ใส่มา (ตามตั้งค่า) ไม่งั้น fallback เป็นราคาขาย
    const g = r.gmv ?? r.lineTotal;
    totalGmv += g;
    totalUnits += r.quantity;
    totalNetRevenue += r.netRevenue;
    if (r.orderNo) orderNos.add(r.orderNo);
    if (r.campaign) campaignSet.add(String(r.campaign).trim());

    const pKey = r.productName;
    if (!byProduct.has(pKey)) {
      byProduct.set(pKey, { name: r.productName, category: r.category, units: 0, gmv: 0 });
    }
    const p = byProduct.get(pKey);
    p.units += r.quantity;
    p.gmv += g;

    const plKey = r.platform.trim();
    if (!byPlatformMap.has(plKey)) {
      byPlatformMap.set(plKey, { platform: plKey, gmv: 0, units: 0, orders: new Set() });
    }
    const pl = byPlatformMap.get(plKey);
    pl.gmv += g;
    pl.units += r.quantity;
    if (r.orderNo) pl.orders.add(r.orderNo);
  }

  const totalOrders = orderNos.size;

  return {
    kpi: {
      totalGmv: round2(totalGmv),
      totalOrders,
      totalUnits: round2(totalUnits),
      totalNetRevenue: round2(totalNetRevenue),
      aov: totalOrders > 0 ? round2(totalGmv / totalOrders) : 0,
      aiv: totalUnits > 0 ? round2(totalGmv / totalUnits) : 0,
    },
    topProducts: [...byProduct.values()]
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5)
      .map((p) => ({ ...p, units: round2(p.units), gmv: round2(p.gmv) })),
    byPlatform: [...byPlatformMap.values()]
      .sort((a, b) => b.gmv - a.gmv)
      .map((pl) => ({
        platform: pl.platform,
        gmv: round2(pl.gmv),
        orders: pl.orders.size,
        units: round2(pl.units),
      })),
    campaigns: [...campaignSet].sort((a, b) => a.localeCompare(b)),
  };
}
