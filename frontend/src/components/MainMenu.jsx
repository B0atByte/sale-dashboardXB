import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import { CENTRAL_WORLD, gmvOf, isBeanExport } from "../utils/data";
import { formatCurrency, formatNumber, formatShortDate } from "../utils/format";
import { IconStore, IconRefresh, IconChevronLeft, IconCoffee } from "./Icons";

/** ต่างกันกี่วันระหว่าง 2 วันที่ (YYYY-MM-DD) */
function daysBetween(a, b) {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da) || Number.isNaN(db)) return Infinity;
  return Math.abs(Math.round((db - da) / 86400000));
}

/**
 * หน้า "เมนูหน้าร้าน" ของสาขา Central World
 * - ดึงข้อมูลการขายของ Central World โดยตรง (ไม่ขึ้นกับตัวกรองแดชบอร์ด)
 * - รวมรายการเมล็ดกาแฟ (Beans/Export) ที่ "ขายอยู่จริง" -> เมนูพร้อมขาย
 * - หมายเหตุ: ชีตยังไม่มีคอลัมน์สต็อกคงเหลือ จึงอนุมาน "พร้อมขาย" จากการขายล่าสุด
 */
export default function MainMenu({ onBack }) {
  const { t, lang } = useLang();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = (force = false) => {
    setLoading(true);
    setError(false);
    const q = `?platform=${encodeURIComponent(CENTRAL_WORLD)}${force ? "&fresh=1" : ""}`;
    fetch(`/api/sales${q}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setRecords(d.records ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { items, totals, maxDate } = useMemo(() => {
    const beans = records.filter(isBeanExport);
    const dates = beans.map((r) => r.date).filter(Boolean);
    const maxD = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : "";

    const map = new Map();
    for (const r of beans) {
      const key = String(r.productName || "").trim() || t("common.na");
      const cur =
        map.get(key) ||
        { name: key, category: r.category || "", units: 0, gmv: 0, orders: new Set(), lastDate: "" };
      cur.units += r.quantity || 0;
      cur.gmv += gmvOf(r);
      if (r.orderNo) cur.orders.add(r.orderNo);
      if (r.date && r.date > cur.lastDate) cur.lastDate = r.date;
      map.set(key, cur);
    }

    const list = [...map.values()]
      .map((p) => ({
        ...p,
        orders: p.orders.size,
        active: Boolean(maxD && p.lastDate && daysBetween(p.lastDate, maxD) <= 7),
      }))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.units - a.units);

    const tot = list.reduce(
      (s, p) => ({ units: s.units + p.units, gmv: s.gmv + p.gmv }),
      { units: 0, gmv: 0 }
    );
    return { items: list, totals: { skus: list.length, ...tot }, maxDate: maxD };
  }, [records, t]);

  return (
    <div className="space-y-6">
      {/* หัวเรื่อง */}
      <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-100 active:scale-95"
          >
            <IconChevronLeft className="h-4 w-4" /> {t("menu.back")}
          </button>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
            <IconStore className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tighter text-slate-800">
              {t("menu.title")}
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("menu.sub")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            title={t("header.refresh")}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm active:scale-95 disabled:opacity-50"
          >
            <IconRefresh className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* สรุปยอดเมนู */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: t("menu.skus"), value: formatNumber(totals.skus) },
            { label: t("menu.totalUnits"), value: `${formatNumber(totals.units)} ${t("menu.pcs")}` },
            { label: t("menu.totalGmv"), value: formatCurrency(totals.gmv) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {s.label}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-medium leading-relaxed text-slate-400">
          {t("menu.note")}
        </p>
      </section>

      {/* รายการเมนู */}
      {loading && !records.length ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 text-center text-sm font-bold text-slate-400 shadow-sm">
          {t("menu.loading")}
        </div>
      ) : error ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 text-center text-sm font-bold text-slate-400 shadow-sm">
          {t("error.load")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 text-center text-sm font-bold text-slate-400 shadow-sm">
          {t("menu.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article
              key={p.name}
              className="group flex flex-col rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <IconCoffee className="h-5 w-5" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    p.active
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {p.active ? t("menu.active") : t("menu.past")}
                </span>
              </div>

              <h3 className="mt-4 line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-snug text-slate-800">
                {p.name}
              </h3>
              {p.category && (
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {p.category}
                </p>
              )}

              <div className="mt-4 flex items-end justify-between border-t border-slate-50 pt-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t("menu.soldUnits")}
                  </p>
                  <p className="text-lg font-bold tracking-tight text-slate-800">
                    {formatNumber(p.units)} {t("menu.pcs")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(p.gmv)}</p>
                  {p.lastDate && (
                    <p className="text-[10px] font-bold text-slate-400">
                      {t("menu.lastSold")} {formatShortDate(p.lastDate, lang)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
