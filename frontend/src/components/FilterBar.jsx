import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import { toDateInputValue } from "../utils/format";
import { CATEGORY_BUCKETS } from "../utils/data";
import { IconRefresh, IconSearch } from "./Icons";

function todayStr() {
  return toDateInputValue(new Date());
}

const PRESETS = [
  { key: "preset.today", range: () => { const t = todayStr(); return { from: t, to: t }; } },
  {
    key: "preset.last7",
    range: () => { const d = new Date(); d.setDate(d.getDate() - 6); return { from: toDateInputValue(d), to: todayStr() }; },
  },
  {
    key: "preset.thisMonth",
    range: () => { const n = new Date(); return { from: toDateInputValue(new Date(n.getFullYear(), n.getMonth(), 1)), to: todayStr() }; },
  },
  { key: "preset.all", range: () => ({ from: "", to: "" }) },
];

/**
 * การ์ดตัวกรอง: ช่วงวันที่ + ปุ่มลัด + หมวดสินค้า + แคมเปญ + ค้นหาสินค้า
 * ทุกช่องมีผลทันที (ช่องค้นหาสินค้า debounce 400ms)
 */
export default function FilterBar({ filters, campaigns = [], locations = [], onChange, onClear }) {
  const { t } = useLang();
  const [productInput, setProductInput] = useState(filters.product || "");
  // ป้ายชื่อ location: แปล "ออนไลน์" ตามภาษา, สาขาอื่นแสดงชื่อตรง ๆ
  const locLabel = (l) => (l === "ออนไลน์" ? t("loc.online") : l);

  // ซิงก์ช่องค้นหาเมื่อถูกล้างจากภายนอก
  useEffect(() => {
    setProductInput(filters.product || "");
  }, [filters.product]);

  // debounce การค้นหาสินค้า
  useEffect(() => {
    const id = setTimeout(() => {
      if ((productInput || "") !== (filters.product || "")) onChange({ product: productInput });
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productInput]);

  const activePreset = useMemo(
    () => PRESETS.find((p) => { const r = p.range(); return r.from === filters.from && r.to === filters.to; }),
    [filters.from, filters.to]
  );

  const labelClass = "text-xs font-medium text-slate-500";
  const inputClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {/* ช่วงวันที่ */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.dateRange")}</span>
          <div className="flex gap-2">
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} className={inputClass} aria-label={t("filter.from")} />
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} className={inputClass} aria-label={t("filter.to")} />
          </div>
        </div>

        {/* ปุ่มลัด */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.quick")}</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const isActive = activePreset?.key === p.key;
              return (
                <button key={p.key} type="button" onClick={() => onChange(p.range())} className={`rounded-lg border px-3 py-2 text-sm font-medium transition active:scale-95 ${isActive ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {t(p.key)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location (สาขา) — โชว์เมื่อมีมากกว่า 1 แหล่ง เช่น ออนไลน์ + Central World */}
        {locations.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className={labelClass}>{t("filter.location")}</span>
            <select value={filters.location || ""} onChange={(e) => onChange({ location: e.target.value })} className={`${inputClass} min-w-40 cursor-pointer`}>
              <option value="">{t("filter.all")}</option>
              {locations.map((l) => (
                <option key={l} value={l}>{locLabel(l)}</option>
              ))}
            </select>
          </div>
        )}

        {/* หมวดสินค้า */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.category")}</span>
          <select value={filters.category || ""} onChange={(e) => onChange({ category: e.target.value })} className={`${inputClass} min-w-40 cursor-pointer`}>
            <option value="">{t("filter.all")}</option>
            {CATEGORY_BUCKETS.map((b) => (
              <option key={b.key} value={b.key}>{t(`cat.${b.key}`)}</option>
            ))}
          </select>
        </div>

        {/* แคมเปญ */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.campaign")}</span>
          <select value={filters.campaign || ""} onChange={(e) => onChange({ campaign: e.target.value })} className={`${inputClass} min-w-40 cursor-pointer`}>
            <option value="">{t("filter.all")}</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* ค้นหาสินค้า */}
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{t("filter.product")}</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={productInput} onChange={(e) => setProductInput(e.target.value)} placeholder={t("filter.product")} className={`${inputClass} min-w-44 pl-9`} />
          </div>
        </div>

        {/* ล้างตัวกรอง */}
        <div className="ml-auto flex items-end">
          <button type="button" onClick={onClear} title={t("filter.clear")} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95">
            <IconRefresh className="h-4 w-4" /> {t("filter.clear")}
          </button>
        </div>
      </div>
    </section>
  );
}
