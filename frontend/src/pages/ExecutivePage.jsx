import { useMemo, useState } from "react";
import { useLang } from "../i18n";
import { useSettings } from "../settings";
import Header from "../components/Header";
import FilterBar from "../components/FilterBar";
import SalesTable from "../components/SalesTable";
import MultiTrendChart from "../components/MultiTrendChart";
import Sparkline from "../components/Sparkline";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import useSalesData, { useFilterOptions } from "../hooks/useSalesData";
import { groupTotals, categoryGroupOf, metricSpark } from "../utils/data";
import { formatCurrency, formatNumber } from "../utils/format";
import { APP_VERSION } from "../version";
import { IconGrid } from "../components/Icons";

// ยอดขายจริงของ xBloom เริ่ม มิ.ย. 2026 (ก่อนหน้านั้นเป็นข้อมูล seed ทดสอบ 3 แถว/เดือน)
// เริ่มสรุปที่ มิ.ย. 2026 → ตัวเลขตรงกับแดชบอร์ดหลัก + กราฟรายเดือนสะอาด ไม่มีเดือนศูนย์รก
const START = "2026-06-01";

const EMPTY_FILTERS = {
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

/** ป้ายชื่อเดือนจาก key "2026-07" -> "ก.ค. 2569" / "Jul 2026" */
function monthName(key, lang) {
  const d = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { month: "short", year: "numeric" });
}

/**
 * Sidebar เฉพาะผู้บริหาร — โครงเดียวกับ Sidebar หน้าแดชบอร์ด แต่มีเมนูเดียว
 * (ไม่มีช่องทางขาย / มุมมองอื่น) เพื่อคงข้อจำกัดของ role executive
 */
function ExecSidebar() {
  const { t } = useLang();
  const { settings } = useSettings();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <img
          src={`${import.meta.env.BASE_URL}xbloom-logo.png`}
          alt="xBloom logo"
          className="h-10 w-10 rounded-2xl shadow-lg shadow-slate-200"
        />
        <div className="min-w-0">
          <h1 className="text-sm font-bold leading-tight tracking-tight text-slate-800">
            {settings.brandTitle}
          </h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-2">
        <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t("nav.views")}
        </p>
        <div className="flex w-full items-center gap-3 rounded-2xl bg-slate-800 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-slate-200">
          <IconGrid className="h-4 w-4 shrink-0 text-white" />
          <span className="truncate">{t("exec2.title")}</span>
        </div>
      </nav>

      <div className="border-t border-slate-100 px-6 py-4">
        <p className="text-[10px] font-bold text-slate-400">{settings.brandFooter}</p>
        <p className="mt-0.5 text-[10px] font-bold tracking-wider text-slate-300">v{APP_VERSION}</p>
      </div>
    </aside>
  );
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
 * ส่วน "ดูรายละเอียดเพิ่มเติม" — ตัวกรอง + ตารางรายการขาย (mount เฉพาะตอนเปิด
 * เพื่อไม่ยิง API ซ้ำโดยไม่จำเป็น). ใช้ useSalesData เอง = กรองฝั่งเซิร์ฟเวอร์
 */
function ExecutiveDetails() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { records, loading, error, refresh } = useSalesData(filters);
  const { campaigns, categories, locations } = useFilterOptions();

  const onChange = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => setFilters(EMPTY_FILTERS);
  const filtersKey = `${filters.from}|${filters.to}|${filters.category}|${filters.campaign}|${filters.product}|${filters.location}`;

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        campaigns={campaigns}
        categories={categories}
        locations={locations}
        onChange={onChange}
        onClear={clearAll}
      />
      {error && <ErrorBanner onRetry={refresh} />}
      {loading && !records.length ? (
        <LoadingSkeleton />
      ) : (
        <SalesTable records={records} filtersKey={filtersKey} />
      )}
    </div>
  );
}

/**
 * หน้า "สรุปผู้บริหาร" (Executive Summary) — สำหรับ role executive เท่านั้น
 * ดีไซน์เดียวกับหน้าแดชบอร์ด (Sidebar + Header + การ์ด) เนื้อหา:
 *   A. KPI 4 กลุ่ม (รวม / เครื่อง / เมล็ด / อุปกรณ์เสริม)
 *   B. แนวโน้มยอดขายรายเดือน 4 เส้น
 *   C. แนวโน้มจำนวนที่ขายรายเดือน 4 เส้น
 *   D. ปุ่ม "ดูรายละเอียดเพิ่มเติม" → ตัวกรอง + ตาราง (ซ่อนไว้ก่อน)
 */
export default function ExecutivePage({ onLogout, user }) {
  const { t, lang } = useLang();
  const { settings } = useSettings();
  // ดึงข้อมูลทั้งชุด (ไม่กรอง) มาทำ KPI + กราฟภาพรวม
  const { records, summary, updatedAt, stale, loading, error, refresh } =
    useSalesData(EMPTY_FILTERS);
  const [showDetails, setShowDetails] = useState(false);
  const [month, setMonth] = useState(""); // "" = ทุกเดือน, ไม่งั้น "2026-07"

  // จำกัดตั้งแต่ มิ.ย. 2026 เป็นต้นมา
  const scoped = useMemo(
    () => records.filter((r) => String(r.date || "") >= START),
    [records]
  );
  // เดือนที่มีข้อมูลจริง (ใหม่สุดอยู่บน) สำหรับดรอปดาวน์กรอง
  const months = useMemo(() => {
    const set = new Set(scoped.map((r) => String(r.date || "").slice(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [scoped]);

  // KPI ยึดตามเดือนที่เลือก (ถ้าเลือก) — ถ้าไม่เลือก = ทั้งหมดตั้งแต่ มิ.ย.
  const kpiRecords = useMemo(
    () => (month ? scoped.filter((r) => String(r.date || "").slice(0, 7) === month) : scoped),
    [scoped, month]
  );
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

  const periodLabel = month ? monthName(month, lang) : t("exec2.kpiSub");
  const isFirstLoad = loading && !summary;

  return (
    <div className="min-h-screen bg-slate-50">
      <ExecSidebar />

      <div className="lg:pl-64">
        <Header
          updatedAt={updatedAt}
          stale={stale}
          loading={loading}
          onRefresh={refresh}
          onLogout={onLogout}
          user={user}
        />

        <main className="mx-auto max-w-7xl space-y-6 px-4 pt-6 pb-16 sm:px-6">
          {/* หัวเรื่อง + ตัวกรองเดือน (คุมเฉพาะการ์ด KPI — กราฟยังโชว์ทุกเดือน) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tighter text-slate-800">{t("exec2.title")}</h2>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("exec2.sub")} · {periodLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("trend.month")}</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label={t("trend.month")}
                className={`${fieldCls} cursor-pointer`}
              >
                <option value="">{t("filter.all")}</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthName(m, lang)}
                  </option>
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

              {/* D. ปุ่มดูรายละเอียด → ตัวกรอง + ตาราง (ซ่อนไว้ก่อน) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
                >
                  {showDetails ? t("exec2.hideDetails") : t("exec2.moreDetails")}
                </button>
              </div>

              {showDetails && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold tracking-tight text-slate-800">{t("exec2.detailsTitle")}</h2>
                  <ExecutiveDetails />
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="py-6 lg:hidden">
          <p className="text-center text-[11px] font-bold text-slate-400">{settings.brandFooter}</p>
          <p className="mt-0.5 text-center text-[10px] font-bold tracking-wider text-slate-300">v{APP_VERSION}</p>
        </footer>
      </div>
    </div>
  );
}
