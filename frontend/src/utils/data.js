/**
 * ตัวช่วยด้านข้อมูล: สีประจำหมวด/ช่องทาง, การจัดกลุ่ม, การรวมยอดรายวัน,
 * การส่งออก CSV และการเลื่อนช่วงวันที่ (สำหรับเทียบช่วงก่อนหน้า)
 *
 * หลักการ: "สีผูกกับ entity" (ชื่อช่องทาง/หมวด) เสมอ ไม่ผูกกับลำดับ/อันดับ
 * ข้อความที่ต้องแปลภาษา (ชื่อหมวด, ป้าย "อื่น ๆ", หัวตาราง CSV) รับ `t` เข้ามา
 */

const OTHER_COLOR = "#64748b"; // slate-500 — ช่องทาง/กลุ่มที่ไม่รู้จัก

/** ยอดขายของแถว — ใช้ฟิลด์ gmv ที่ backend ใส่มา (ตามตั้งค่า) ไม่งั้น fallback ราคาขาย */
export function gmvOf(r) {
  return r.gmv ?? r.lineTotal ?? 0;
}

// ชื่อสาขา Central World (ใช้เทียบแบบ contains กันสะกดเว้นวรรคต่างกัน)
export const CENTRAL_WORLD = "Central World Branch";
export const ONLINE_LOCATION = "ออนไลน์";

/** แถวนี้เป็นของสาขา Central World ไหม (ดูจาก location ก่อน แล้ว fallback ไป platform) */
export function isCentralWorld(r) {
  return String(r.location || r.platform || "")
    .trim()
    .toLowerCase()
    .includes("central world");
}

/** แถวนี้เป็น "เครื่อง xBloom" ไหม — หมวด xBloom Studio (ทนกรณี Categroy ว่างแล้ว fallback เป็นชื่อรุ่น) */
export function isMachine(r) {
  const text = `${r.category || ""} ${r.productName || ""}`.toLowerCase();
  return text.includes("xbloom studio");
}

// สีเครื่อง xBloom (จับจากชื่อสินค้า) — key = คำที่ค้นในชื่อ, color = สีในโดนัท
export const MACHINE_COLORS = [
  { key: "midnight black", label: "Midnight Black", color: "#0f172a" },
  { key: "moonlight white", label: "Moonlight White", color: "#cbd5e1" },
  { key: "sage green", label: "Sage Green", color: "#22c55e" },
  { key: "twilight", label: "Twilight", color: "#7c3aed" },
];

/** จับสีเครื่องจากชื่อสินค้า — คืน entry ใน MACHINE_COLORS หรือ null ถ้าไม่ตรง */
export function machineColorOf(r) {
  const text = String(r.productName || "").toLowerCase();
  return MACHINE_COLORS.find((c) => text.includes(c.key)) || null;
}

/** แถวนี้เป็น "เมล็ดกาแฟ" (Beans/Export) ไหม — ดูจากชื่อสินค้า + หมวด */
export function isBeanExport(r) {
  const text = `${r.productName || ""} ${r.category || ""}`.toLowerCase();
  return text.includes("bean") || text.includes("export") || text.includes("เมล็ด");
}

/**
 * สรุปผู้บริหาร 3 กล่อง จาก records (เคารพตัวกรองที่ส่งเข้ามา):
 * - online  = ทุกช่องทาง ยกเว้น Central World
 * - central = เฉพาะ Central World Branch
 * - beans   = สินค้าเมล็ดกาแฟ (Beans/Export) รวมทั้งออนไลน์และหน้าร้าน
 * แต่ละกล่องคืน { gmv, units, orders }
 */
export function execSummaryFrom(records = []) {
  const blank = () => ({ gmv: 0, units: 0, orders: new Set() });
  const online = blank();
  const central = blank();
  const beans = blank();
  for (const r of records) {
    const g = gmvOf(r);
    const q = r.quantity || 0;
    const bucket = isCentralWorld(r) ? central : online;
    bucket.gmv += g;
    bucket.units += q;
    if (r.orderNo) bucket.orders.add(r.orderNo);
    if (isBeanExport(r)) {
      beans.gmv += g;
      beans.units += q;
      if (r.orderNo) beans.orders.add(r.orderNo);
    }
  }
  const fin = (b) => ({ gmv: b.gmv, units: b.units, orders: b.orders.size });
  return { online: fin(online), central: fin(central), beans: fin(beans) };
}

// สีประจำช่องทาง (คีย์เป็นชื่อ trimmed + lowercase)
const PLATFORM_COLOR_MAP = {
  shopee: "#ea580c",
  lazada: "#0284c7",
  "line shop": "#16a34a",
  "direct sales": "#7c3aed",
  b2b: "#e11d48",
  "event masala": "#ca8a04",
  voucher: "#0d9488",
  "central world branch": "#db2777",
};

export function platformColor(name) {
  const key = String(name || "").trim().toLowerCase();
  return PLATFORM_COLOR_MAP[key] ?? OTHER_COLOR;
}

// ---- ลำดับช่องทางที่ผู้ใช้จัดเอง (เก็บใน localStorage ต่ออุปกรณ์) ----
const PLATFORM_ORDER_KEY = "xbloom_platform_order";

/** อ่านลำดับช่องทางที่ผู้ใช้ตั้งไว้ */
export function readPlatformOrder() {
  try {
    const arr = JSON.parse(localStorage.getItem(PLATFORM_ORDER_KEY) || "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** บันทึกลำดับช่องทาง */
export function savePlatformOrder(list) {
  try {
    localStorage.setItem(PLATFORM_ORDER_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    /* localStorage ไม่พร้อม (private mode) — ข้ามไป */
  }
}

/** จัดช่องทางตามลำดับที่ตั้งไว้ (ที่ตั้งไว้ก่อน, ช่องทางใหม่ที่ยังไม่ถูกจัดต่อท้ายตามเดิม) */
export function applyPlatformOrder(platforms = [], order = []) {
  if (!order.length) return platforms;
  const inOrder = order.filter((p) => platforms.includes(p));
  const rest = platforms.filter((p) => !inOrder.includes(p));
  return [...inOrder, ...rest];
}

// หมวดสินค้า 3 กลุ่ม — คีย์คงที่ (ชื่อที่แสดงมาจากไฟล์แปลภาษาผ่าน t)
export const CATEGORY_BUCKETS = [
  { key: "studio", color: "#4f46e5" },
  { key: "consumables", color: "#059669" },
  { key: "accessories", color: "#d97706" },
  { key: "tea", color: "#e11d48" },
];
const BUCKET_COLOR = Object.fromEntries(
  CATEGORY_BUCKETS.map((b) => [b.key, b.color])
);

/** จัดหมวดสินค้าเป็นคีย์ 1 ใน 4 กลุ่ม จากชื่อสินค้า + หมวดในเรคคอร์ด */
export function bucketKeyOf(record) {
  const text = `${record.productName || ""} ${record.category || ""}`.toLowerCase();
  // TEA มาก่อน (ชาอาจมาในซองเหมือนกัน จะได้ไม่ถูกนับเป็น consumables)
  if (text.includes("tea")) {
    return "tea";
  }
  if (
    text.includes("midnight black") ||
    text.includes("moonlight white") ||
    text.includes("sage green") ||
    text.includes("twilight") ||
    text.includes("studio")
  ) {
    return "studio";
  }
  if (
    text.includes("xpod") ||
    text.includes("bean") ||
    text.includes("sachet") ||
    text.includes("เมล็ด")
  ) {
    return "consumables";
  }
  return "accessories";
}

// พาเลตต์แคมเปญ (ใช้ตามลำดับหลังเรียงชื่อแคมเปญตามตัวอักษร)
const CAMPAIGN_PALETTE = [
  "#ea580c",
  "#0284c7",
  "#16a34a",
  "#7c3aed",
  "#e11d48",
  "#ca8a04",
  "#0d9488",
];

/** ค่าที่ใช้คิดสัดส่วน: ยอดขาย (บาท) หรือ จำนวนชิ้น */
export function metricOf(r, metric) {
  return metric === "units" ? r.quantity || 0 : gmvOf(r);
}

/**
 * จำกัดข้อมูลเป็น "ช่วงล่าสุด" ตามความละเอียดที่เลือก
 * day = วันล่าสุด · month = เดือนล่าสุด · year = ปีล่าสุด (ของข้อมูลที่กรองอยู่)
 */
export function scopeLatest(records = [], gran = "year") {
  const dates = records.map((r) => r.date).filter(Boolean);
  if (!dates.length) return records;
  const max = dates.reduce((a, b) => (a > b ? a : b));
  const key = gran === "year" ? max.slice(0, 4) : gran === "month" ? max.slice(0, 7) : max;
  return records.filter((r) => String(r.date || "").startsWith(key));
}

/** โดนัทช่องทาง จาก records -> [{name,value,color}] */
export function platformDonutFrom(records = [], metric = "gmv", t = (k) => k) {
  const totals = new Map();
  for (const r of records) {
    const k = String(r.platform || "").trim() || t("common.na");
    totals.set(k, (totals.get(k) || 0) + metricOf(r, metric));
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, color: platformColor(name) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}

// พาเลตต์หมวดสินค้า (ใช้ตามลำดับหลังเรียงชื่อหมวดตามตัวอักษร — สีคงที่ต่อชื่อ)
const CATEGORY_PALETTE = [
  "#4f46e5", "#059669", "#d97706", "#e11d48", "#0891b2",
  "#7c3aed", "#ca8a04", "#0d9488", "#db2777", "#2563eb",
];

/**
 * โดนัทหมวดสินค้า — จัดกลุ่มตามค่า "Category" ในชีตโดยตรง (dynamic)
 * แก้ชื่อหมวดในชีตแล้วเปลี่ยนตามอัตโนมัติ ไม่ผูกกับกลุ่มตายตัว
 * สีผูกกับชื่อหมวด (เรียงตามตัวอักษร) เพื่อให้สีคงที่แม้ค่าจะเปลี่ยน
 */
export function categoryDonut(records = [], metric = "gmv", t = (k) => k) {
  const totals = new Map();
  for (const r of records) {
    const k = String(r.category || "").trim() || t("common.na");
    totals.set(k, (totals.get(k) || 0) + metricOf(r, metric));
  }
  const names = [...totals.keys()].sort((a, b) => a.localeCompare(b));
  const colorFor = Object.fromEntries(
    names.map((n, i) => [n, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]])
  );
  let items = names
    .map((n) => ({ name: n, value: totals.get(n), color: colorFor[n] }))
    .filter((d) => d.value > 0);
  // ยุบหมวดย่อยที่เกิน 8 อันดับเป็น "อื่น ๆ" (กันชื่อสินค้าที่หลุดมาเป็นหมวดตอน Categroy ว่าง)
  if (items.length > 8) {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const keep = sorted.slice(0, 7);
    const otherVal = sorted.slice(7).reduce((s, x) => s + x.value, 0);
    items = [...keep, { name: t("common.other"), value: otherVal, color: OTHER_COLOR }];
  }
  return items.sort((a, b) => b.value - a.value);
}

/** โดนัทแคมเปญ จาก records — เกิน 7 กลุ่มยุบกลุ่มเล็กสุดเป็น "อื่น ๆ" */
export function campaignDonut(records = [], metric = "gmv", t = (k) => k) {
  const totals = new Map();
  for (const r of records) {
    const c = String(r.campaign || "").trim() || t("common.na");
    totals.set(c, (totals.get(c) || 0) + metricOf(r, metric));
  }
  const names = [...totals.keys()].sort((a, b) => a.localeCompare(b));
  const colorFor = Object.fromEntries(
    names.map((n, i) => [n, CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length]])
  );
  let items = names.map((n) => ({
    name: n,
    value: totals.get(n),
    color: colorFor[n],
  }));
  if (items.length > 7) {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const keep = sorted.slice(0, 6);
    const otherVal = sorted.slice(6).reduce((s, x) => s + x.value, 0);
    items = [...keep, { name: t("common.other"), value: otherVal, color: OTHER_COLOR }];
  }
  return items.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
}

/** โดนัทสัดส่วนลูกค้า จาก records (ใช้ในหน้า B2B) — เกิน 7 รายยุบเป็น "อื่น ๆ" */
export function customerDonut(records = [], metric = "gmv", t = (k) => k) {
  const totals = new Map();
  for (const r of records) {
    const k = String(r.customer || "").trim() || t("common.na");
    totals.set(k, (totals.get(k) || 0) + metricOf(r, metric));
  }
  const names = [...totals.keys()].sort((a, b) => a.localeCompare(b));
  const colorFor = Object.fromEntries(
    names.map((n, i) => [n, CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length]])
  );
  let items = names.map((n) => ({ name: n, value: totals.get(n), color: colorFor[n] }));
  if (items.length > 7) {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const keep = sorted.slice(0, 6);
    const otherVal = sorted.slice(6).reduce((s, x) => s + x.value, 0);
    items = [...keep, { name: t("common.other"), value: otherVal, color: OTHER_COLOR }];
  }
  return items.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
}

/** ซีรีส์รายวัน [{date,gmv,orders,units}] เรียงจากวันเก่าไปใหม่ */
export function dailySeries(records = []) {
  const byDate = new Map();
  for (const r of records) {
    if (!r.date) continue;
    const cur =
      byDate.get(r.date) ||
      { date: r.date, gmv: 0, units: 0, orderSet: new Set() };
    cur.gmv += gmvOf(r);
    cur.units += r.quantity || 0;
    if (r.orderNo) cur.orderSet.add(r.orderNo);
    byDate.set(r.date, cur);
  }
  return [...byDate.values()]
    .map((d) => ({
      date: d.date,
      gmv: d.gmv,
      units: d.units,
      orders: d.orderSet.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** ซีรีส์รายวันของเมตริกเดียว (array ตัวเลข) สำหรับ sparkline */
export function metricSpark(records = [], metric = "gmv") {
  const series = dailySeries(records);
  return series.map((d) => d[metric] ?? 0);
}

/** เลื่อนช่วง [from,to] ย้อนหลัง 1 ช่วง (ยาวเท่ากัน) -> {from,to} หรือ null */
export function previousRange(from, to) {
  if (!from || !to) return null;
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return null;
  const days = Math.round((t - f) / 86400000) + 1; // นับรวมวันปลายทั้งสอง
  const prevTo = new Date(f);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: iso(prevFrom), to: iso(prevTo) };
}

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** เลื่อนช่วง [from,to] ย้อนหลัง 1 สัปดาห์/เดือน/ปี (คงความยาวช่วงไว้) */
export function shiftRange(from, to, kind) {
  if (!from || !to) return null;
  const shift = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (kind === "week") d.setDate(d.getDate() - 7);
    else if (kind === "month") d.setDate(d.getDate() - 30);
    else if (kind === "year") d.setFullYear(d.getFullYear() - 1);
    return iso(d);
  };
  return { from: shift(from), to: shift(to) };
}

/**
 * รวมข้อมูลสำหรับกราฟแนวโน้ม ตามความละเอียด (day/month/year) และเมตริก (gmv/units)
 * คืน [{ key, value }] เรียงตามเวลา
 */
export function aggregateTrend(records = [], granularity = "day", metric = "gmv") {
  const map = new Map();
  for (const r of records) {
    if (!r.date) continue;
    const key =
      granularity === "year"
        ? r.date.slice(0, 4)
        : granularity === "month"
          ? r.date.slice(0, 7)
          : r.date;
    const val = metric === "units" ? r.quantity || 0 : gmvOf(r);
    map.set(key, (map.get(key) || 0) + val);
  }
  return [...map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** ส่งออก records เป็น CSV (มี BOM, ครอบค่าที่มี comma/quote/ขึ้นบรรทัด) */
export function exportSalesCsv(records = [], filename = "xbloom-sales", t = (k) => k) {
  if (!records.length) return;
  const cols = [
    ["date", t("col.date")],
    ["platform", t("col.platform")],
    ["customer", t("col.customer")],
    ["orderNo", t("col.order")],
    ["productName", t("col.product")],
    ["category", t("col.category")],
    ["campaign", t("col.campaign")],
    ["quantity", t("col.qty")],
    ["lineTotal", t("col.amount")],
    ["netRevenue", t("col.net")],
  ];
  const esc = (v) => {
    let s = String(v ?? "");
    // กัน CSV/formula injection: ค่าข้อความที่ขึ้นต้นด้วย = + - @ (หรือ tab/CR)
    // อาจถูก Excel/Sheets ตีความเป็นสูตร — เติม ' นำหน้า (ยกเว้นตัวเลขจริง เช่น -500)
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((c) => c[1]).join(",");
  const rows = records.map((r) => cols.map((c) => esc(r[c[0]])).join(","));
  const csv = `﻿${header}\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
