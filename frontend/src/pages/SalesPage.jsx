import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import { useSettings } from "../settings";
import Sidebar from "../components/Sidebar";
import AiInsight from "../components/AiInsight";
import AiChat from "../components/AiChat";
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
import AdminModal from "../components/AdminModal";
import ActivityLog from "../components/ActivityLog";
import useSalesData, {
  useFilterOptions,
  useComparisons,
} from "../hooks/useSalesData";
import {
  platformDonut,
  categoryDonut,
  campaignDonut,
  readPlatformOrder,
  savePlatformOrder,
  applyPlatformOrder,
} from "../utils/data";

const EMPTY_FILTERS = {
  from: "",
  to: "",
  platform: "",
  category: "",
  campaign: "",
  product: "",
};

/**
 * หน้าแดชบอร์ดยอดขาย
 */
export default function SalesPage({ onLogout, user }) {
  const { t } = useLang();
  const { settings, reloadSettings } = useSettings();
  const canOpenAdmin = ["admin", "itsupport"].includes(user?.role);
  const isIt = user?.role === "itsupport";
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [adminOpen, setAdminOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const { records, summary, updatedAt, stale, loading, error, refresh } =
    useSalesData(filters, settings.refreshIntervalMs);
  const { platforms, campaigns } = useFilterOptions();

  // ลำดับช่องทางที่ผู้ใช้จัดเอง (ลากใน sidebar) — จำใน localStorage
  const [platformOrder, setPlatformOrder] = useState(readPlatformOrder);
  const orderedPlatforms = useMemo(
    () => applyPlatformOrder(platforms, platformOrder),
    [platforms, platformOrder]
  );
  const reorderPlatforms = (names) => {
    setPlatformOrder(names);
    savePlatformOrder(names);
  };

  // ช่วงวันที่ของข้อมูลจริง (ใช้เทียบเมื่อผู้ใช้ไม่ได้เลือกช่วงเอง)
  const dateSpan = useMemo(() => {
    const ds = records.map((r) => r.date).filter(Boolean).sort();
    return ds.length ? { from: ds[0], to: ds[ds.length - 1] } : null;
  }, [records]);
  const comparisons = useComparisons(filters, dateSpan);

  const filtersKey = `${filters.from}|${filters.to}|${filters.platform}|${filters.category}|${filters.campaign}|${filters.product}`;
  const isOverview = !filters.platform;
  const isFirstLoad = loading && !summary;
  const activeLabel = filters.platform || t("nav.overview");

  const setPlatform = (platform) => setFilters((f) => ({ ...f, platform }));
  const onFilterChange = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => setFilters(EMPTY_FILTERS);

  // เช็คว่า backend เปิดใช้ AI ไหม
  const [aiEnabled, setAiEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/status", { credentials: "same-origin", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setAiEnabled(Boolean(d.enabled)))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        platforms={orderedPlatforms}
        active={filters.platform}
        onSelect={setPlatform}
        onReorder={reorderPlatforms}
        showLog={isIt}
        onOpenLog={() => setLogOpen(true)}
      />

      <div className="lg:pl-64">
        <Header
          updatedAt={updatedAt}
          stale={stale}
          loading={loading}
          onRefresh={refresh}
          onLogout={onLogout}
          onOpenAdmin={canOpenAdmin ? () => setAdminOpen(true) : undefined}
          user={user}
        />

        {loading && summary && <LoadingBadge label={activeLabel} />}

        <main className="mx-auto max-w-7xl space-y-6 px-4 pt-6 pb-28 sm:px-6">
          <div className="lg:hidden">
            <PlatformTabs platforms={orderedPlatforms} active={filters.platform} onSelect={setPlatform} />
          </div>

          <FilterBar filters={filters} campaigns={campaigns} onChange={onFilterChange} onClear={clearAll} />

          {error && <ErrorBanner onRetry={refresh} />}

          {isFirstLoad ? (
            <LoadingSkeleton />
          ) : (
            summary && (
              <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
                <KpiCards kpi={summary.kpi} records={records} comparisons={comparisons} />

                {aiEnabled && (
                  <AiInsight from={filters.from} to={filters.to} platform={filters.platform} />
                )}

                {/* โดนัท 2 คอลัมน์ */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {isOverview ? (
                    <DonutChart title={t("chart.platformShare")} subtitle={t("chart.platformShareSub")} data={platformDonut(summary.byPlatform, t)} />
                  ) : (
                    <DonutChart title={t("chart.campaignShare")} subtitle={t("chart.campaignShareSub")} data={campaignDonut(records, t)} />
                  )}
                  <DonutChart title={t("chart.categoryShare")} subtitle={t("chart.categoryShareSub")} data={categoryDonut(records, t)} />
                </div>

                {/* แนวโน้ม + Top 5 */}
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

        {aiEnabled && <AiChat />}

        <footer className="py-6 lg:hidden">
          <p className="text-center text-[11px] font-bold text-slate-400">{settings.brandFooter}</p>
        </footer>
      </div>

      <AdminModal
        open={adminOpen}
        user={user}
        onClose={() => setAdminOpen(false)}
        onChanged={() => {
          refresh();
          reloadSettings();
        }}
      />

      {isIt && <ActivityLog open={logOpen} onClose={() => setLogOpen(false)} />}
    </div>
  );
}
