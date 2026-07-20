import { useState } from "react";
import { useLang } from "../i18n";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import PlatformTabs from "../components/PlatformTabs";
import FilterBar from "../components/FilterBar";
import KpiCards from "../components/KpiCards";
import DonutChart from "../components/DonutChart";
import TrendChart from "../components/TrendChart";
import TopProducts from "../components/TopProducts";
import SalesTable from "../components/SalesTable";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import LoadingBadge from "../components/LoadingBadge";
import useSalesData, {
  usePlatformOptions,
  useComparisonSummary,
} from "../hooks/useSalesData";
import { platformDonut, categoryDonut, campaignDonut } from "../utils/data";

const EMPTY_FILTERS = { from: "", to: "", platform: "" };

/**
 * หน้าแดชบอร์ดยอดขาย (หน้าเดียวของแอป)
 * เลย์เอาต์: Sidebar เมนูช่องทางด้านซ้าย (จอใหญ่) + คอลัมน์เนื้อหาด้านขวา
 * บนจอเล็ก Sidebar ซ่อน แล้วใช้แท็บช่องทางแนวนอนแทน
 */
export default function SalesPage({ onLogout }) {
  const { t } = useLang();
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { records, summary, updatedAt, stale, loading, error, refresh } =
    useSalesData(filters);
  const platformOptions = usePlatformOptions();
  const comparison = useComparisonSummary(filters);

  // ลายเซ็นตัวกรอง — เปลี่ยนเฉพาะเมื่อผู้ใช้แก้ตัวกรอง (บอกตารางให้รีเซ็ตหน้า)
  const filtersKey = `${filters.from}|${filters.to}|${filters.platform}`;
  const isOverview = !filters.platform;
  const isFirstLoad = loading && !summary;
  // ป้าย "กำลังดึงข้อมูล" โชว์ตอนผู้ใช้สั่งโหลด (มีข้อมูลเดิมอยู่แล้ว) — บอกว่ากำลังดึงช่องทางไหน
  const activeLabel = filters.platform || t("nav.overview");

  const setPlatform = (platform) => setFilters((f) => ({ ...f, platform }));
  const applyDates = ({ from, to }) => setFilters((f) => ({ ...f, from, to }));
  const clearAll = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        platforms={platformOptions}
        active={filters.platform}
        onSelect={setPlatform}
      />

      {/* คอลัมน์เนื้อหา — เว้นซ้าย 16rem ให้ Sidebar บนจอใหญ่ */}
      <div className="lg:pl-64">
        <Header
          updatedAt={updatedAt}
          stale={stale}
          loading={loading}
          onRefresh={refresh}
          onLogout={onLogout}
        />

        {/* ป้ายลอย "กำลังดึงข้อมูล: <ช่องทาง>" — เฉพาะตอนผู้ใช้สั่งโหลด ไม่ใช่ auto-refresh */}
        {loading && summary && <LoadingBadge label={activeLabel} />}

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          {/* แท็บช่องทางแนวนอน เฉพาะจอเล็ก (จอใหญ่ใช้ Sidebar) */}
          <div className="lg:hidden">
            <PlatformTabs
              platforms={platformOptions}
              active={filters.platform}
              onSelect={setPlatform}
            />
          </div>

          <FilterBar
            from={filters.from}
            to={filters.to}
            onApply={applyDates}
            onClear={clearAll}
          />

          {error && <ErrorBanner onRetry={refresh} />}

          {isFirstLoad ? (
            <LoadingSkeleton />
          ) : (
            summary && (
              /* ระหว่างรีเฟรช ให้เนื้อหาเดิมจางลงเล็กน้อยแทนการกระพริบเป็น skeleton */
              <div
                className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
              >
                <KpiCards
                  kpi={summary.kpi}
                  records={records}
                  comparison={comparison}
                />

                {/* แถวกราฟโดนัท 2 คอลัมน์ */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {isOverview ? (
                    <DonutChart
                      title={t("chart.platformShare")}
                      subtitle={t("chart.platformShareSub")}
                      data={platformDonut(summary.byPlatform, t)}
                    />
                  ) : (
                    <DonutChart
                      title={t("chart.campaignShare")}
                      subtitle={t("chart.campaignShareSub")}
                      data={campaignDonut(records, t)}
                    />
                  )}
                  <DonutChart
                    title={t("chart.categoryShare")}
                    subtitle={t("chart.categoryShareSub")}
                    data={categoryDonut(records, t)}
                  />
                </div>

                {/* แนวโน้มรายวัน (กว้าง 2/3) + สินค้าขายดี (1/3) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <TrendChart records={records} />
                  </div>
                  <TopProducts products={summary.topProducts} />
                </div>

                <SalesTable records={records} filtersKey={filtersKey} />
              </div>
            )
          )}
        </main>

        {/* ท้ายหน้า เฉพาะจอเล็ก (จอใหญ่มีลิขสิทธิ์อยู่ท้าย Sidebar แล้ว) */}
        <footer className="py-6 lg:hidden">
          <p className="text-center text-[11px] font-bold text-slate-400">
            {t("footer")}
          </p>
        </footer>
      </div>
    </div>
  );
}
