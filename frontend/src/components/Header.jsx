import { useLang } from "../i18n";
import { formatTime } from "../utils/format";
import { IconRefresh, IconLogout } from "./Icons";
import DemoBadge from "./DemoBadge";

/**
 * แถบหัวเรื่องด้านบนของคอลัมน์เนื้อหา: ปุ่มสลับภาษา + เวลาอัปเดต + ปุ่มรีเฟรช
 * แบรนด์แสดงเฉพาะจอเล็ก (จอใหญ่ย้ายไปอยู่ใน Sidebar)
 */
export default function Header({ updatedAt, stale, loading, onRefresh, onLogout }) {
  const { t, lang, setLang } = useLang();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
        {/* แบรนด์ (เฉพาะจอเล็ก — จอใหญ่แสดงใน Sidebar) */}
        <div className="flex items-center gap-3 lg:hidden">
          <img
            src="/xbloom-logo.png"
            alt="xBloom logo"
            className="h-10 w-10 rounded-2xl shadow-lg shadow-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tighter text-slate-800">
                xBloom Sale Dashboard
              </h1>
              <DemoBadge />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t("brand.subtitle")}
            </p>
          </div>
        </div>

        {/* สถานะ + สลับภาษา + ปุ่มรีเฟรช */}
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {stale && (
            <span
              className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-600"
              title={t("header.staleTitle")}
            >
              {t("header.stale")}
            </span>
          )}

          <div className="text-right">
            <p className="text-sm font-bold text-slate-700">
              {t("header.updated")} {formatTime(updatedAt)}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t("header.autoRefresh")}
            </p>
          </div>

          {/* ปุ่มสลับภาษา TH / EN */}
          <div className="flex items-center rounded-xl border border-slate-100 bg-slate-50 p-0.5">
            {["th", "en"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                  lang === l
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title={t("header.refresh")}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm active:scale-95 disabled:opacity-50"
          >
            <IconRefresh className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={t("header.logout")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-rose-600 hover:shadow-sm active:scale-95"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
