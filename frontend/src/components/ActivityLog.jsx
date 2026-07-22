import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import {
  IconX,
  IconRefresh,
  IconSearch,
  IconActivity,
  IconLogin,
  IconAlert,
  IconLock,
  IconLogout,
  IconUserPlus,
  IconUserMinus,
  IconDocument,
  IconSettings,
  IconTarget,
} from "./Icons";

/** icon/สีของแต่ละเหตุการณ์ (แยกด้วยสี ดูง่าย ไม่ลายตา) */
const META = {
  login_success: { Icon: IconLogin, label: "เข้าสู่ระบบ", cls: "border-emerald-100 bg-emerald-50 text-emerald-700" },
  login_fail: { Icon: IconAlert, label: "เข้าระบบล้มเหลว", cls: "border-rose-100 bg-rose-50 text-rose-700" },
  login_locked: { Icon: IconLock, label: "ถูกล็อก", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  logout: { Icon: IconLogout, label: "ออกจากระบบ", cls: "border-slate-100 bg-slate-50 text-slate-500" },
  user_add: { Icon: IconUserPlus, label: "เพิ่มผู้ใช้", cls: "border-indigo-100 bg-indigo-50 text-indigo-700" },
  user_remove: { Icon: IconUserMinus, label: "ลบผู้ใช้", cls: "border-amber-100 bg-amber-50 text-amber-700" },
  source_change: { Icon: IconDocument, label: "เปลี่ยนแหล่งข้อมูล", cls: "border-sky-100 bg-sky-50 text-sky-700" },
  settings_change: { Icon: IconSettings, label: "เปลี่ยนตั้งค่า", cls: "border-slate-200 bg-slate-100 text-slate-600" },
  target_change: { Icon: IconTarget, label: "ตั้งเป้ายอดขาย", cls: "border-slate-200 bg-slate-100 text-slate-600" },
};

const FILTERS = [
  { k: "all", label: "ทั้งหมด" },
  { k: "login", label: "เข้าระบบ", types: ["login_success", "logout"] },
  { k: "fail", label: "ล้มเหลว/ล็อก", types: ["login_fail", "login_locked"] },
  { k: "users", label: "ผู้ใช้", types: ["user_add", "user_remove"] },
  { k: "system", label: "ระบบ", types: ["source_change", "settings_change", "target_change"] },
];

/**
 * หน้า Log กิจกรรม (เปิดจาก sidebar, เห็นเฉพาะ itsupport)
 * ตารางดูง่าย: กรองตามหมวด + ค้นหา + สีแยกเหตุการณ์ + เลื่อนดูได้เยอะ
 */
export default function ActivityLog({ open, onClose }) {
  const { lang } = useLang();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/activity?limit=1000", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.activity) ? d.activity : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (open) load();
  }, [open]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.k === filter);
    const types = f?.types;
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (types && !types.includes(r.type)) return false;
      if (query && !`${r.actor} ${r.detail} ${r.ip} ${r.role}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, filter, q]);

  if (!open) return null;
  const fmtTs = (iso) => {
    try {
      return new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "th-TH");
    } catch {
      return iso;
    }
  };
  const th = "sticky top-0 bg-slate-50 px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* หัว */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white">
              <IconActivity className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Log กิจกรรม</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={load} title="รีเฟรช" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600">
              <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100">
              <IconX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* แถบกรอง + ค้นหา */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              type="button"
              onClick={() => setFilter(f.k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filter === f.k ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto">
            <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา ผู้ใช้ / IP / รายละเอียด"
              className="w-60 rounded-xl border-none bg-slate-50 py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* ตาราง (เลื่อนได้ หัวตารางติดบน) */}
        <div className="thin-scrollbar overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className={th}>เวลา</th>
                <th className={th}>เหตุการณ์</th>
                <th className={th}>ผู้ใช้</th>
                <th className={th}>รายละเอียด</th>
                <th className={th}>IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-slate-400">ไม่มีข้อมูล</td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const m = META[r.type] || { Icon: IconActivity, label: r.type, cls: "border-slate-100 bg-slate-50 text-slate-500" };
                  const Icon = m.Icon;
                  return (
                    <tr key={i} className="border-t border-slate-50 odd:bg-white even:bg-slate-50/40 hover:bg-indigo-50/40">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-500">{fmtTs(r.ts)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold ${m.cls}`}>
                          <Icon className="h-3.5 w-3.5" /> {m.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="font-bold text-slate-700">{r.actor}</span>
                        {r.role && r.role !== "-" && <span className="ml-1 text-[11px] text-slate-400">({r.role})</span>}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-xs text-slate-500" title={r.detail}>{r.detail || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-400">{r.ip}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
