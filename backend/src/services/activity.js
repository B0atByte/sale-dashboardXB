/**
 * activity.js — บันทึก log กิจกรรม/ประวัติการใช้งาน (เก็บใน data/activity.json)
 * - เก็บ login/logout/login ล้มเหลว + การกระทำของ admin/it (ผู้ใช้/แหล่งข้อมูล/ตั้งค่า/เป้า)
 * - เหตุการณ์สำคัญ (login + เปลี่ยนแหล่งข้อมูล + เพิ่ม/ลบผู้ใช้) แจ้งเข้า Discord แบบ embed สวย ๆ
 * - หน้าแสดง log เห็นเฉพาะ role itsupport (บังคับที่ route)
 */
import { createStore } from './jsonStore.js';
import { notifyDiscordEmbed } from './notify.js';

const store = createStore('activity.json', []);
const MAX_ENTRIES = 2000; // เก็บ log ล่าสุดสูงสุดเท่านี้ (กันไฟล์โตไม่จำกัด)

// ชนิดเหตุการณ์ที่แจ้งเข้า Discord (login + action สำคัญ)
const DISCORD_TYPES = new Set([
  'login_success',
  'login_fail',
  'login_locked',
  'user_add',
  'user_remove',
  'source_change',
]);

const LABEL = {
  login_success: 'เข้าสู่ระบบ', login_fail: 'เข้าระบบล้มเหลว', login_locked: 'ถูกล็อก (เดา PIN เกิน)',
  logout: 'ออกจากระบบ', user_add: 'เพิ่มผู้ใช้', user_remove: 'ลบผู้ใช้',
  source_change: 'เปลี่ยนแหล่งข้อมูล', settings_change: 'เปลี่ยนตั้งค่า', target_change: 'ตั้งเป้ายอดขาย',
};
const COLOR = {
  login_success: 0x22c55e, login_fail: 0xef4444, login_locked: 0xdc2626, logout: 0x94a3b8,
  user_add: 0x6366f1, user_remove: 0xf59e0b, source_change: 0x0ea5e9,
  settings_change: 0x64748b, target_change: 0x64748b,
};

function readList() {
  try {
    const cur = store.read();
    return Array.isArray(cur) ? cur : [];
  } catch (err) {
    console.error(`[activity] อ่าน activity.json ไม่ได้ เริ่มรายการใหม่: ${err.message}`);
    return [];
  }
}

function buildEmbed(e) {
  const fields = [
    { name: 'ผู้ใช้', value: `\`${e.actor}\`${e.role !== '-' ? ` · ${e.role}` : ''}`, inline: true },
    { name: 'IP', value: `\`${e.ip}\``, inline: true },
  ];
  if (e.detail) fields.push({ name: 'รายละเอียด', value: String(e.detail).slice(0, 1000), inline: false });
  return {
    // ใช้สี (แถบซ้ายของ embed) แยกประเภทเหตุการณ์ แทนการใช้ emoji
    title: LABEL[e.type] || e.type,
    color: COLOR[e.type] ?? 0x64748b,
    fields,
    timestamp: e.ts,
    footer: { text: 'xBloom Sales Dashboard' },
  };
}

/** บันทึกเหตุการณ์ 1 รายการ + แจ้ง Discord ตามชนิด (ไม่ throw ไม่ว่ากรณีใด) */
export function logActivity({ type, actor = '-', role = '-', ip = '-', detail = '' }) {
  const entry = {
    ts: new Date().toISOString(),
    type,
    actor: String(actor || '-').slice(0, 40),
    role: String(role || '-').slice(0, 20),
    ip: String(ip || '-').slice(0, 60),
    detail: String(detail || '').slice(0, 300),
  };
  let list = readList();
  list.push(entry);
  if (list.length > MAX_ENTRIES) list = list.slice(list.length - MAX_ENTRIES);
  try {
    store.write(list);
  } catch (err) {
    console.error(`[activity] เขียน activity.json ไม่ได้: ${err.message}`);
  }
  if (DISCORD_TYPES.has(type)) {
    notifyDiscordEmbed(buildEmbed(entry));
  }
  return entry;
}

/** อ่าน log ล่าสุด (ใหม่สุดก่อน) */
export function getActivity(limit = 300) {
  const list = readList();
  return list.slice(-limit).reverse();
}
