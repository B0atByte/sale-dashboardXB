import { useLang } from "../i18n";
import { useSettings } from "../settings";
import { platformColor } from "../utils/data";
import DemoBadge from "./DemoBadge";

/**
 * แถบเมนูด้านซ้าย (sidebar) — แสดงเฉพาะจอใหญ่ (lg ขึ้นไป)
 * บนจอเล็กจะซ่อนไว้ แล้วใช้ <PlatformTabs> แนวนอนแทน
 *
 * รายการเมนู = "ภาพรวม" + หนึ่งรายการต่อช่องทาง (เรียงตาม GMV)
 * เลือกเมนู = ตั้งค่าตัวกรอง platform ("ภาพรวม" = ค่าว่าง = ไม่กรองช่องทาง)
 */
export default function Sidebar({ platforms = [], active = "", onSelect }) {
  const { t } = useLang();
  const { settings } = useSettings();
  const items = [{ name: "", label: t("nav.overview"), color: "#4f46e5" }].concat(
    platforms.map((p) => ({ name: p, label: p, color: platformColor(p) }))
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white lg:flex">
      {/* แบรนด์ */}
      <div className="flex items-center gap-3 px-6 py-6">
        <img
          src="/xbloom-logo.png"
          alt="xBloom logo"
          className="h-10 w-10 rounded-2xl shadow-lg shadow-slate-200"
        />
        <div className="min-w-0">
          <h1 className="text-sm font-bold leading-tight tracking-tight text-slate-800">
            {settings.brandTitle}
          </h1>
          {settings.showDemo && <DemoBadge className="mt-1" />}
        </div>
      </div>

      {/* เมนูช่องทาง */}
      <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-2">
        <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t("nav.section")}
        </p>
        {items.map((item) => {
          const isActive = (active || "") === item.name;
          return (
            <button
              key={item.name || "overview"}
              type="button"
              onClick={() => onSelect(item.name)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] ${
                isActive
                  ? "bg-slate-800 text-white shadow-lg shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ท้าย sidebar */}
      <div className="border-t border-slate-100 px-6 py-4">
        <p className="text-[10px] font-bold text-slate-400">{settings.brandFooter}</p>
      </div>
    </aside>
  );
}
