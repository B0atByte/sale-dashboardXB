/**
 * ฟังก์ชันช่วยจัดรูปแบบตัวเลข / เงิน / วันที่ — รองรับ 2 ภาษา (ไทย/อังกฤษ)
 * ตัวเลข/เงินแสดงเหมือนกันทั้งสองภาษา (คั่นหลักด้วย ",") ต่างกันแค่ "วันที่"
 * (ไทย: พ.ศ. + เดือนไทย / อังกฤษ: ค.ศ. + เดือนอังกฤษ)
 */

/** map ภาษาของแอป -> locale ของ JS สำหรับจัดรูปแบบวันที่ */
function localeOf(lang) {
  return lang === "en" ? "en-GB" : "th-TH";
}

/** จัดรูปแบบจำนวนเต็ม เช่น 12345 -> "12,345" */
export function formatNumber(value) {
  return (value ?? 0).toLocaleString("en-US");
}

/**
 * จัดรูปแบบเงินบาท เช่น 1234567.89 -> "฿1,234,568"
 * ค่ามาก (>= 1,000) ไม่แสดงทศนิยม / ค่าน้อยแสดงทศนิยมไม่เกิน 2 ตำแหน่ง
 */
export function formatCurrency(value) {
  const v = value ?? 0;
  const options =
    Math.abs(v) >= 1000
      ? { maximumFractionDigits: 0 }
      : { maximumFractionDigits: 2 };
  return `฿${v.toLocaleString("en-US", options)}`;
}

/** ย่อจำนวนแบบกระชับ เช่น 1234567 -> "1.2M", 48920 -> "48.9k" */
export function formatCompact(value) {
  const v = value ?? 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** ย่อจำนวนเงินแบบกระชับ เช่น 48920 -> "฿48.9k" */
export function formatCompactCurrency(value) {
  return `฿${formatCompact(value)}`;
}

/**
 * แปลงสตริง YYYY-MM-DD เป็นวันที่ตามภาษา
 * ไทย -> "5 ม.ค. 2569" (พ.ศ.) / อังกฤษ -> "5 Jan 2026"
 */
export function formatDate(dateStr, lang = "th") {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(localeOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** วันที่แบบสั้นไม่มีปี เช่น "2 มิ.ย." / "2 Jun" — ใช้กับแกนกราฟ */
export function formatShortDate(dateStr, lang = "th") {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(localeOf(lang), {
    day: "numeric",
    month: "short",
  });
}

/** แปลง ISO timestamp เป็นเวลา HH:mm:ss (24 ชม.) */
export function formatTime(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** แปลง Date เป็นสตริง YYYY-MM-DD ตามเวลาท้องถิ่น (สำหรับ input[type=date]) */
export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
