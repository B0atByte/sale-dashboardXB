/**
 * สิทธิ์ "มุมมอง" (views) ต่อผู้ใช้ — คุมว่าเห็นเมนูไหนบ้างในแดชบอร์ด
 * เก็บใน user.access.views (allow-list). ถ้าไม่ได้ตั้ง → ใช้ค่าเริ่มต้นตาม role
 *   dashboard = พื้นฐาน (มีเสมอถ้ามีสิทธิ์ช่องทาง) — ไม่อยู่ในลิสต์นี้
 *   menu / xbloom = ทุก role เห็นโดยค่าเริ่มต้น
 *   executive = เฉพาะ admin / itsupport โดยค่าเริ่มต้น
 */
export const OPTIONAL_VIEWS = ["menu", "xbloom", "executive"];

/** คืน Set ของมุมมองเสริมที่ผู้ใช้เห็นได้ */
export function allowedViews(user) {
  const v = user?.access?.views;
  if (Array.isArray(v)) return new Set(v.filter((x) => OPTIONAL_VIEWS.includes(x)));
  const s = new Set(["menu", "xbloom"]);
  if (["admin", "itsupport"].includes(user?.role)) s.add("executive");
  return s;
}
