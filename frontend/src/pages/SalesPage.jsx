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
import ExecutiveSummary from "../components/ExecutiveSummary";
import BeansReport from "../components/BeansReport";
import XBloomView from "../components/XBloomView";
import ExecutiveSummaryPanel from "../components/ExecutiveSummaryView";
import DonutChart from "../components/DonutChart";
import TrendChart from "../components/TrendChart";
import TopProducts from "../components/TopProducts";
import SalesTable from "../components/SalesTable";
import ToggleGroup from "../components/ToggleGroup";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";
import LoadingBadge from "../components/LoadingBadge";
import AdminModal from "../components/AdminModal";
import ActivityLog from "../components/ActivityLog";
import useSalesData, {
  useFilterOptions,
  useComparisons,
} from "../hooks/useSalesData";
import ShopeeFees from "../components/ShopeeFees";
import {
  platformDonutFrom,
  categoryDonut,
  campaignDonut,
  customerDonut,
  readPlatformOrder,
  savePlatformOrder,
  applyPlatformOrder,
} from "../utils/data";
import { APP_VERSION } from "../version";

const EMPTY_FILTERS = {
  from: "",
  to: "",
  platform: "",
  category: "",
  campaign: "",
  product: "",
  location: "",
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
  const [view, setView] = useState("dashboard"); // "dashboard" | "menu"
  const [salesView, setSalesView] = useState("list"); // "list" (รายการขาย) | "fees" (ค่าธรรมเนียม & รายรับสุทธิ) — เฉพาะช่องทางออนไลน์

  const { records, summary, updatedAt, stale, loading, error, refresh } =
    useSalesData(filters, settings.refreshIntervalMs);
  const { platforms, campaigns, categories, locations } = useFilterOptions();

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

  const filtersKey = `${filters.from}|${filters.to}|${filters.platform}|${filters.category}|${filters.campaign}|${filters.product}|${filters.location}`;
  const isOverview = !filters.platform;
  const isFirstLoad = loading && !summary;
  const activeLabel = filters.platform || t("nav.overview");

  // สิทธิ์เห็นหน้า "ภาพรวม" — ผู้ใช้ specific access (overview=false) ให้เด้งเข้า Dashboard ช่องทางแรก
  const canOverview = user?.access?.overview !== false;

  const setPlatform = (platform) => setFilters((f) => ({ ...f, platform }));
  const onFilterChange = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setChannelProduct(""); // ล้างช่องค้นหาในการ์ด Sales by Channel ด้วย
  };
  // สลับมุมมอง — ไป "แดชบอร์ด" = ล้างช่องทางกลับเป็น overview (แทนปุ่มภาพรวมที่ลบไป)
  const goView = (v) => {
    setView(v);
    if (v === "dashboard") setPlatform("");
  };

  // มุมมองเฉพาะช่องทาง
  const platLower = (filters.platform || "").trim().toLowerCase();
  const isB2B = platLower === "b2b";
  // แพลตฟอร์มออนไลน์ = เลือกช่องทางแล้ว และไม่ใช่สาขาหน้าร้าน (เช่น Central World) → โชว์การ์ดค่าธรรมเนียม
  const isOnlinePlatform = useMemo(() => {
    if (!filters.platform) return false;
    const stores = new Set((locations || []).filter((l) => l && l !== "ออนไลน์"));
    return !stores.has(filters.platform);
  }, [filters.platform, locations]);

  // ค้นหาสินค้าในการ์ด "Sales by Channel" — พิมพ์ชื่อสินค้าเพื่อดูยอดแยกตามช่องทาง
  const [channelProduct, setChannelProduct] = useState("");
  const channelRecords = useMemo(() => {
    const q = channelProduct.trim().toLowerCase();
    return q ? records.filter((r) => String(r.productName || "").toLowerCase().includes(q)) : records;
  }, [records, channelProduct]);

  // ถ้าไม่มีสิทธิ์เห็นภาพรวม แต่ยังไม่ได้เลือกช่องทาง → เลือกช่องทางแรกที่มีสิทธิ์ให้อัตโนมัติ
  useEffect(() => {
    if (!canOverview && !filters.platform && orderedPlatforms.length > 0) {
      setFilters((f) => ({ ...f, platform: orderedPlatforms[0] }));
    }
  }, [canOverview, filters.platform, orderedPlatforms]);

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
        onSelect={(p) => { setPlatform(p); setView("dashboard"); }}
        onReorder={reorderPlatforms}
        showLog={isIt}
        onOpenLog={() => setLogOpen(true)}
        view={view}
        onChangeView={goView}
        locations={locations}
        showOverview={canOverview}
        showExecutive={canOpenAdmin}
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
          {/* สลับมุมมองบนจอเล็ก (จอใหญ่ใช้ปุ่มใน Sidebar) */}
          <div className="flex gap-2 lg:hidden">
            {[
              { v: "dashboard", label: t("nav.dashboard") },
              { v: "menu", label: t("nav.mainMenu") },
              { v: "xbloom", label: t("nav.xbloomView") },
              ...(canOpenAdmin ? [{ v: "executive", label: t("nav.executive") }] : []),
            ].map((it) => {
              // "แดชบอร์ด" active เฉพาะตอน overview (ไม่ได้เลือกช่องทาง) → active ทีละปุ่มเดียว
              const on = it.v === "dashboard" ? view === "dashboard" && !filters.platform : view === it.v;
              return (
                <button
                  key={it.v}
                  type="button"
                  onClick={() => goView(it.v)}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                    on ? "bg-slate-800 text-white shadow-lg shadow-slate-200" : "border border-slate-100 bg-white text-slate-500"
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>

          {view === "menu" ? (
            <BeansReport />
          ) : view === "xbloom" ? (
            <XBloomView />
          ) : view === "executive" ? (
            <ExecutiveSummaryPanel />
          ) : (
          <>
          <div className="lg:hidden">
            <PlatformTabs platforms={orderedPlatforms} active={filters.platform} onSelect={setPlatform} locations={locations} showOverview={canOverview} />
          </div>

          <FilterBar filters={filters} campaigns={campaigns} categories={categories} locations={locations} onChange={onFilterChange} onClear={clearAll} />

          {error && <ErrorBanner onRetry={refresh} />}

          {isFirstLoad ? (
            <LoadingSkeleton />
          ) : (
            summary && (
              <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
                {/* กราฟแนวโน้มยอดขายรายวัน — ย้ายขึ้นบนสุด */}
                <TrendChart records={records} />

                {isOverview && canOverview && <ExecutiveSummary records={records} />}

                <KpiCards kpi={summary.kpi} records={records} comparisons={comparisons} />

                {aiEnabled && (
                  <AiInsight from={filters.from} to={filters.to} platform={filters.platform} />
                )}

                {/* โดนัท + Top 5 (จอใหญ่ = 3 คอลัมน์) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {isOverview ? (
                    <DonutChart
                      title={t("chart.platformShare")}
                      subtitle={t("chart.platformShareSub")}
                      records={channelRecords}
                      build={platformDonutFrom}
                      search={channelProduct}
                      onSearch={setChannelProduct}
                      searchPlaceholder={t("filter.product")}
                    />
                  ) : isB2B ? (
                    <DonutChart title={t("chart.customerShare")} subtitle={t("chart.customerShareSub")} records={records} build={customerDonut} />
                  ) : (
                    <DonutChart title={t("chart.campaignShare")} subtitle={t("chart.campaignShareSub")} records={records} build={campaignDonut} />
                  )}
                  <DonutChart title={t("chart.categoryShare")} subtitle={t("chart.categoryShareSub")} records={records} build={categoryDonut} />
                  <TopProducts products={summary.topProducts} />
                </div>

                {/* ช่องทางออนไลน์: รวม "รายการขาย" กับ "ค่าธรรมเนียม & รายรับสุทธิ" ไว้ก้อนเดียว
                    มีปุ่มสลับมุมมอง (เริ่มที่รายการขาย) — ช่องทางอื่นโชว์รายการขายอย่างเดียว */}
                {isOnlinePlatform ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <ToggleGroup
                        value={salesView}
                        onChange={setSalesView}
                        options={[
                          { v: "list", label: t("table.title") },
                          { v: "fees", label: t("shopee.title") },
                        ]}
                      />
                    </div>
                    {salesView === "fees" ? (
                      <ShopeeFees records={records} />
                    ) : (
                      <SalesTable records={records} filtersKey={filtersKey} />
                    )}
                  </div>
                ) : (
                  <SalesTable
                    records={records}
                    filtersKey={filtersKey}
                    hideColumns={isB2B ? ["platform", "campaign"] : []}
                  />
                )}
              </div>
            )
          )}
          </>
          )}
        </main>

        {aiEnabled && <AiChat />}

        <footer className="py-6 lg:hidden">
          <p className="text-center text-[11px] font-bold text-slate-400">{settings.brandFooter}</p>
          <p className="mt-0.5 text-center text-[10px] font-bold tracking-wider text-slate-300">v{APP_VERSION}</p>
        </footer>
      </div>

      <AdminModal
        open={adminOpen}
        user={user}
        platforms={orderedPlatforms}
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
