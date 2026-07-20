import { useMemo } from "react";
import { useLang } from "../i18n";
import { toDateInputValue } from "../utils/format";
import { IconRefresh } from "./Icons";

/** สร้างสตริงวันนี้แบบ YYYY-MM-DD (เวลาท้องถิ่น) */
function todayStr() {
  return toDateInputValue(new Date());
}

/** ชุดช่วงวันที่สำเร็จรูป (key ใช้แปลภาษา, range คืนค่าช่วงวันที่) */
const PRESETS = [
  {
    key: "preset.today",
    range: () => {
      const t = todayStr();
      return { from: t, to: t };
    },
  },
  {
    key: "preset.last7",
    range: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: toDateInputValue(d), to: todayStr() };
    },
  },
  {
    key: "preset.thisMonth",
    range: () => {
      const n = new Date();
      return {
        from: toDateInputValue(new Date(n.getFullYear(), n.getMonth(), 1)),
        to: todayStr(),
      };
    },
  },
  { key: "preset.all", range: () => ({ from: "", to: "" }) },
];

/**
 * การ์ดตัวกรอง: เลือกช่วงวันที่หรือปุ่มลัด แล้ว "กรองและแสดงผลทันที"
 * (ไม่มีปุ่มยืนยัน — ทุกการเปลี่ยนแปลงมีผลกับข้อมูลทันที)
 */
export default function FilterBar({ from, to, onApply, onClear }) {
  const { t } = useLang();

  // ปุ่มลัดใดที่ตรงกับช่วงที่ใช้อยู่ปัจจุบัน (ใช้ไฮไลต์)
  const activePreset = useMemo(
    () =>
      PRESETS.find((p) => {
        const r = p.range();
        return r.from === from && r.to === to;
      }),
    [from, to]
  );

  const labelClass =
    "text-[11px] font-black uppercase tracking-[2px] text-slate-500";
  const inputClass =
    "rounded-xl border-none bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {/* ช่วงวันที่ — เลือกแล้วกรองทันที */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.dateRange")}</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => onApply({ from: e.target.value, to })}
              className={inputClass}
              aria-label={t("filter.from")}
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => onApply({ from, to: e.target.value })}
              className={inputClass}
              aria-label={t("filter.to")}
            />
          </div>
        </div>

        {/* ปุ่มลัดช่วงเวลา — มีผลทันที */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.quick")}</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const isActive = activePreset?.key === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onApply(p.range())}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition active:scale-95 ${
                    isActive
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-100"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {t(p.key)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ล้างตัวกรอง */}
        <div className="ml-auto flex items-end">
          <button
            type="button"
            onClick={onClear}
            title={t("filter.clear")}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-50 active:scale-95"
          >
            <IconRefresh className="h-4 w-4" /> {t("filter.clear")}
          </button>
        </div>
      </div>
    </section>
  );
}
