import { useMemo, useState } from "react";
import { useLang } from "../i18n";
import MultiTrendChart from "./MultiTrendChart";
import Sparkline from "./Sparkline";
import ErrorBanner from "./ErrorBanner";
import LoadingSkeleton from "./LoadingSkeleton";
import useSalesData from "../hooks/useSalesData";
import { groupTotals, categoryGroupOf, metricSpark } from "../utils/data";
import { formatCurrency, formatNumber } from "../utils/format";

// แสดง "ทุกช่วงเวลา" (2024 → ปัจจุบัน) — ก่อน มิ.ย. 2026 เป็นยอดสรุปรายเดือนย้อนหลังจริง
// (แถว platform="Total" 3 หมวด/เดือน: xBloom Studio / Beans / Accessories) ไม่ใช่ข้อมูลทดสอบ
// จึงไม่ตัดทิ้ง เพื่อให้ตัวเลขตรงกับแดชบอร์ดหลักและครบตามที่ผู้บริหารต้องการ

// ตัวกรองว่าง — ใช้ดึงข้อมูล "ทั้งชุด" (ไม่กรอง) มาทำ KPI + กราฟภาพรวม
export const EXEC_EMPTY_FILTERS = {
  from: "",
  to: "",
  platform: "",
  category: "",
  campaign: "",
  product: "",
  location: "",
};

// การ์ด KPI 4 กลุ่ม — สีตรงกับเส้นในกราฟ MultiTrendChart
const KPI_CARDS = [
  { key: "total", labelKey: "group.total", color: "#0f172a" },
  { key: "machine", labelKey: "group.machine", color: "#4f46e5" },
  { key: "beans", labelKey: "group.beans", color: "#059669" },
  { key: "accessories", labelKey: "group.accessories", color: "#d97706" },
];

const fieldCls =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white";

/** ชื่อเดือนแบบสั้นไม่มีปี "2026-07" -> "ก.ค." / "Jul" (ใช้คู่กับดรอปดาวน์ปี) */
function monthShortName(key, lang) {
  const d = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { month: "short" });
}

/** การ์ด KPI เดียว — สไตล์เดียวกับ KpiCards หน้าแดชบอร์ด (sparkline + เลขใหญ่ tabular) */
function KpiCard({ card, gmv, units, spark, t }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.color }} />
          {t(card.labelKey)}
        </h3>
        <div className="opacity-40 transition-opacity group-hover:opacity-80">
          <Sparkline data={spark} color={card.color} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums lg:text-4xl">
        {formatCurrency(gmv)}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">
        {formatNumber(units)} {t("exec2.units")}
      </p>
    </div>
  );
}

/**
 * เนื้อหา "สรุปผู้บริหาร" (presentational) — รับข้อมูลผ่าน props เพื่อใช้ซ้ำได้
 * ทั้งในหน้า role executive และในแดชบอร์ดของ admin
 *   A. KPI 4 กลุ่ม (มีตัวกรองเดือน)
 *   B. แนวโน้มยอดขายรายเดือน 4 เส้น
 *   C. แนวโน้มจำนวนที่ขายรายเดือน 4 เส้น
 * (ไม่มี "Sales Details" — เอาออกตามที่ต้องการ)
 */
export function ExecutiveSummaryView({ records = [], loading = false, error = false, refresh }) {
  const { t, lang } = useLang();
  const [year, setYear] = useState("");   // "" = ทุกปี, ไม่งั้น "2025"
  const [month, setMonth] = useState(""); // "" = ทุกเดือน, ไม่งั้น "2025-07"

  // เห็นเฉพาะข้อมูลตั้งแต่ปี 2024 เป็นต้นมา (ตัดแถวไม่มีวันที่ / ก่อน 2024 ทิ้ง)
  const scoped = useMemo(
    () => records.filter((r) => String(r.date || "") >= "2024-01-01"),
    [records]
  );
  // ปีที่มีข้อมูลจริง (ใหม่สุดอยู่บน)
  const years = useMemo(() => {
    const set = new Set(scoped.map((r) => String(r.date || "").slice(0, 4)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [scoped]);
  // เดือนของปีที่เลือก (ใหม่สุดอยู่บน) — โชว์เฉพาะเมื่อเลือกปีแล้ว
  const monthsOfYear = useMemo(() => {
    if (!year) return [];
    const set = new Set(
      scoped
        .filter((r) => String(r.date || "").slice(0, 4) === year)
        .map((r) => String(r.date || "").slice(0, 7))
        .filter(Boolean)
    );
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [scoped, year]);

  // KPI ยึดตาม เดือน > ปี > ทั้งหมด
  const kpiRecords = useMemo(() => {
    if (month) return scoped.filter((r) => String(r.date || "").slice(0, 7) === month);
    if (year) return scoped.filter((r) => String(r.date || "").slice(0, 4) === year);
    return scoped;
  }, [scoped, year, month]);
  const salesTotals = useMemo(() => groupTotals(kpiRecords, "gmv"), [kpiRecords]);
  const unitTotals = useMemo(() => groupTotals(kpiRecords, "units"), [kpiRecords]);
  // sparkline รายวันต่อกลุ่ม (total = ทั้งหมด)
  const sparks = useMemo(() => {
    const out = {};
    for (const c of KPI_CARDS) {
      const recs = c.key === "total" ? kpiRecords : kpiRecords.filter((r) => categoryGroupOf(r) === c.key);
      out[c.key] = metricSpark(recs, "gmv");
    }
    return out;
  }, [kpiRecords]);

  // ป้ายช่วงเวลา: เดือน > ปี > ช่วงปีทั้งหมด (เช่น 2024–2026)
  const periodLabel = month
    ? `${monthShortName(month, lang)} ${month.slice(0, 4)}`
    : year
      ? year
      : years.length
        ? `${years[years.length - 1]}–${years[0]}`
        : t("exec2.kpiSub");
  const isFirstLoad = loading && records.length === 0;

  return (
    <div className="space-y-6">
      {/* หัวเรื่อง + ตัวกรองเดือน (คุมเฉพาะการ์ด KPI — กราฟยังโชว์ทุกเดือน) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter text-slate-800">{t("exec2.title")}</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t("exec2.sub")} · {periodLabel}
          </p>
        </div>
        {/* กรอง ปี -> เดือน (เลือกปีก่อน แล้วค่อยเลือกเดือนของปีนั้น) */}
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => { setYear(e.target.value); setMonth(""); }}
            aria-label={t("trend.year")}
            className={`${fieldCls} cursor-pointer`}
          >
            <option value="">{t("exec2.allYears")}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={!year}
            aria-label={t("trend.month")}
            className={`${fieldCls} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <option value="">{t("exec2.allMonths")}</option>
            {monthsOfYear.map((m) => (
              <option key={m} value={m}>{monthShortName(m, lang)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBanner onRetry={refresh} />}

      {isFirstLoad ? (
        <LoadingSkeleton />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
          {/* A. KPI 4 กลุ่ม */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPI_CARDS.map((c) => (
              <KpiCard
                key={c.key}
                card={c}
                gmv={salesTotals[c.key]}
                units={unitTotals[c.key]}
                spark={sparks[c.key]}
                t={t}
              />
            ))}
          </section>

          {/* B. แนวโน้มยอดขายรายเดือน (฿) */}
          <MultiTrendChart
            records={scoped}
            metric="gmv"
            title={t("exec2.salesTrend")}
            subtitle={t("exec2.salesTrendSub")}
          />

          {/* C. แนวโน้มจำนวนที่ขายรายเดือน (ชิ้น) */}
          <MultiTrendChart
            records={scoped}
            metric="units"
            title={t("exec2.unitTrend")}
            subtitle={t("exec2.unitTrendSub")}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper ดึงข้อมูลเอง (ทั้งชุด ไม่กรอง) — mount เมื่อไรก็ยิงเมื่อนั้น
 * ใช้ในแดชบอร์ดของ admin (เรนเดอร์เฉพาะตอนสลับมาหน้านี้ = ไม่ยิงถ้าไม่ได้เปิด)
 */
export default function ExecutiveSummaryPanel() {
  const { records, loading, error, refresh } = useSalesData(EXEC_EMPTY_FILTERS);
  return <ExecutiveSummaryView records={records} loading={loading} error={error} refresh={refresh} />;
}
