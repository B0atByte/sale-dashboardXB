import { useLang } from "../i18n";
import { useSettings } from "../settings";
import Header from "../components/Header";
import useSalesData from "../hooks/useSalesData";
import { ExecutiveSummaryView, EXEC_EMPTY_FILTERS } from "../components/ExecutiveSummaryView";
import { APP_VERSION } from "../version";
import { IconGrid } from "../components/Icons";

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

/**
 * หน้า "สรุปผู้บริหาร" สำหรับ role executive เท่านั้น — โครงเหมือนแดชบอร์ด
 * (Sidebar + Header) ครอบเนื้อหา ExecutiveSummaryView (ใช้ร่วมกับแดชบอร์ด admin)
 */
export default function ExecutivePage({ onLogout, user }) {
  const { settings } = useSettings();
  const { records, updatedAt, stale, loading, error, refresh } = useSalesData(EXEC_EMPTY_FILTERS);

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
          <ExecutiveSummaryView records={records} loading={loading} error={error} refresh={refresh} />
        </main>

        <footer className="py-6 lg:hidden">
          <p className="text-center text-[11px] font-bold text-slate-400">{settings.brandFooter}</p>
          <p className="mt-0.5 text-center text-[10px] font-bold tracking-wider text-slate-300">v{APP_VERSION}</p>
        </footer>
      </div>
    </div>
  );
}
