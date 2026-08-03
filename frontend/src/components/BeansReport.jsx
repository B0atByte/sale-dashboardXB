import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import { gmvOf, isBeanExport } from "../utils/data";
import { formatCurrency, formatNumber, formatShortDate } from "../utils/format";
import { IconCoffee, IconRefresh, IconSearch, IconX } from "./Icons";
import TrendChart from "./TrendChart";
import ToggleGroup from "./ToggleGroup";

/** ต่างกันกี่วันระหว่าง 2 วันที่ (YYYY-MM-DD) */
function daysBetween(a, b) {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da) || Number.isNaN(db)) return Infinity;
  return Math.abs(Math.round((db - da) / 86400000));
}

const fieldCls =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white";

/**
 * หน้า "รายงานเมล็ดกาแฟ" (แทนที่เมนูหน้าร้านเดิม) — เป็นหน้าแยกใน sidebar
 * - toggle ช่วงเวลา วัน/เดือน/ปี + เลือกช่วงเจาะจงได้ (date/month/year picker, ตั้งต้น = ล่าสุด)
 * - dropdown ช่องทาง/แพลตฟอร์ม: ทุกช่องทาง หรือเจาะจง (Central World / Shopee / Lazada ...)
 * - กราฟแนวโน้ม + ตารางสรุปตามเมล็ด (ค้นหาได้)
 */
export default function BeansReport() {
  const { t, lang } = useLang();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [gran, setGran] = useState("year"); // year | month | day
  const [channel, setChannel] = useState(""); // "" = ทุกช่องทาง
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState(""); // วันอ้างอิงที่เลือก (YYYY-MM-DD)

  const load = (force = false) => {
    setLoading(true);
    setError(false);
    fetch(`/api/sales${force ? "?fresh=1" : ""}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        const beans = (d.records ?? []).filter(isBeanExport);
        setRecords(beans);
        const dates = beans.map((r) => r.date).filter(Boolean);
        if (dates.length) {
          const max = dates.reduce((a, b) => (a > b ? a : b));
          setAnchor((prev) => prev || max); // ตั้งต้นที่วันล่าสุด (ครั้งแรกเท่านั้น)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ช่องทางที่มีเมล็ดขาย (ตัวเลือกใน dropdown)
  const channels = useMemo(() => {
    const set = new Set();
    for (const r of records) {
      const p = String(r.platform || "").trim();
      if (p) set.add(p);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records]);

  // ขอบเขตวันของข้อมูล + รายการปีที่มี (สำหรับ picker)
  const beanDates = useMemo(() => records.map((r) => r.date).filter(Boolean), [records]);
  const dataMin = beanDates.length ? beanDates.reduce((a, b) => (a < b ? a : b)) : "";
  const dataMax = beanDates.length ? beanDates.reduce((a, b) => (a > b ? a : b)) : "";
  const years = useMemo(() => {
    const set = new Set(beanDates.map((d) => d.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [beanDates]);

  // กรองตามช่องทางก่อน
  const channelScoped = useMemo(
    () =>
      channel
        ? records.filter((r) => String(r.platform || "").trim() === channel)
        : records,
    [records, channel]
  );

  // จำกัดตามช่วงที่เลือก (ปี = 4 ตัว, เดือน = 7 ตัว, วัน = ทั้งวันที่)
  const scopeKey =
    gran === "year" ? anchor.slice(0, 4) : gran === "month" ? anchor.slice(0, 7) : anchor;
  const scoped = useMemo(
    () => channelScoped.filter((r) => String(r.date || "").startsWith(scopeKey)),
    [channelScoped, scopeKey]
  );

  // รวมยอดตามเมล็ดในช่วงที่เลือก
  const { beans, totals } = useMemo(() => {
    const dates = scoped.map((r) => r.date).filter(Boolean);
    const maxD = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : "";
    const map = new Map();
    for (const r of scoped) {
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
      .sort((a, b) => b.gmv - a.gmv);
    const tot = list.reduce(
      (s, p) => ({ units: s.units + p.units, gmv: s.gmv + p.gmv }),
      { units: 0, gmv: 0 }
    );
    return { beans: list, totals: { skus: list.length, ...tot } };
  }, [scoped, t]);

  // ค้นหาชื่อเมล็ด (เฉพาะตาราง)
  const q = query.trim().toLowerCase();
  const rows = q ? beans.filter((p) => p.name.toLowerCase().includes(q)) : beans;

  // ความละเอียดกราฟ: ปี → รายเดือน, เดือน/วัน → รายวัน
  const chartGran = gran === "year" ? "month" : "day";
  const hasData = records.length > 0;

  const summaryCards = [
    { label: t("menu.skus"), value: formatNumber(totals.skus) },
    { label: t("menu.totalUnits"), value: `${formatNumber(totals.units)} ${t("menu.pcs")}` },
    { label: t("menu.totalGmv"), value: formatCurrency(totals.gmv) },
  ];

  return (
    <div className="space-y-6">
      {/* หัวเรื่อง + ตัวกรอง */}
      <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <IconCoffee className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tighter text-slate-800">
              {t("report.title")}
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("report.sub")}
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

        {/* ตัวกรอง: ช่วงเวลา (toggle + เลือกวัน/เดือน/ปีเจาะจง) + ช่องทาง */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ToggleGroup
            value={gran}
            onChange={setGran}
            options={[
              { v: "year", label: t("trend.year") },
              { v: "month", label: t("trend.month") },
              { v: "day", label: t("trend.day") },
            ]}
          />

          {/* ตัวเลือกช่วงเจาะจง — เปลี่ยนตามความละเอียด */}
          {gran === "day" ? (
            <input
              type="date"
              value={anchor}
              min={dataMin || undefined}
              max={dataMax || undefined}
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
              aria-label={t("report.pickDate")}
              className={fieldCls}
            />
          ) : gran === "month" ? (
            <input
              type="month"
              value={anchor.slice(0, 7)}
              min={dataMin ? dataMin.slice(0, 7) : undefined}
              max={dataMax ? dataMax.slice(0, 7) : undefined}
              onChange={(e) =>
                e.target.value && setAnchor(`${e.target.value}-${anchor.slice(8) || "01"}`)
              }
              aria-label={t("report.pickMonth")}
              className={fieldCls}
            />
          ) : (
            <select
              value={anchor.slice(0, 4)}
              onChange={(e) => setAnchor(`${e.target.value}-${anchor.slice(5) || "01-01"}`)}
              aria-label={t("report.pickYear")}
              className={fieldCls}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* ช่องทาง / แพลตฟอร์ม */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t("report.channel")}
            </span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={fieldCls}
            >
              <option value="">{t("report.allChannels")}</option>
              {channels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* สรุปยอด (ตามตัวกรอง) */}
        {hasData && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summaryCards.map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {s.label}
                </p>
                <p className="mt-1 text-xl font-bold tracking-tight text-slate-800">{s.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading && !records.length ? (
        <div className="space-y-6" role="status" aria-label={t("menu.loading")}>
          {/* skeleton เต้น ๆ ระหว่างดึงข้อมูล — ไม่ปล่อยจอว่าง */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-100"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
          <div className="h-80 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
        </div>
      ) : error ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 text-center text-sm font-bold text-slate-400 shadow-sm">
          {t("error.load")}
        </div>
      ) : !hasData ? (
        <div className="rounded-[32px] border border-slate-100 bg-white p-16 text-center text-sm font-bold text-slate-400 shadow-sm">
          {t("menu.empty")}
        </div>
      ) : (
        <>
          {/* กราฟแนวโน้ม — ช่วงคุมด้วย toggle ด้านบน (ซ่อนปุ่มช่วงในการ์ด) */}
          <TrendChart
            records={scoped}
            gran={chartGran}
            showGranToggle={false}
            title={t("report.trendTitle")}
          />

          {/* ตารางสรุปตามเมล็ด */}
          <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold tracking-tight text-slate-800">
                {t("report.tableTitle")}
              </h3>
              <div className="relative ml-auto w-full sm:w-72">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("menu.searchPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    title={t("menu.clear")}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-slate-400">
                {beans.length === 0 ? t("menu.empty") : t("menu.noMatch")}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-3 py-2.5">{t("report.colBean")}</th>
                      <th className="px-3 py-2.5">{t("report.colStatus")}</th>
                      <th className="px-3 py-2.5 text-right">{t("report.colUnits")}</th>
                      <th className="px-3 py-2.5 text-right">{t("report.colGmv")}</th>
                      <th className="px-3 py-2.5 text-right">{t("report.colLast")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr
                        key={p.name}
                        className="border-b border-slate-50 transition hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-3">
                          <p className="font-bold text-slate-800">{p.name}</p>
                          {p.category && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {p.category}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                              p.active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {p.active ? t("menu.active") : t("menu.past")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-800">
                          {formatNumber(p.units)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-800">
                          {formatCurrency(p.gmv)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-slate-400">
                          {p.lastDate ? formatShortDate(p.lastDate, lang) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
