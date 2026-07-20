import { useLang } from "../i18n";
import { platformColor } from "../utils/data";

/**
 * แถบแท็บช่องทาง (ใช้บนจอเล็กแทน Sidebar):
 * "ภาพรวม" + หนึ่งแท็บต่อช่องทาง (เรียงตาม GMV)
 */
export default function PlatformTabs({ platforms = [], active = "", onSelect }) {
  const { t } = useLang();
  const tabs = [{ name: "", label: t("nav.overview"), color: "#4f46e5" }].concat(
    platforms.map((p) => ({ name: p, label: p, color: platformColor(p) }))
  );

  return (
    <div className="thin-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => {
        const isActive = (active || "") === tab.name;
        return (
          <button
            key={tab.name || "overview"}
            type="button"
            onClick={() => onSelect(tab.name)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
              isActive
                ? "bg-slate-800 text-white shadow-lg shadow-slate-200"
                : "border border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab.name && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tab.color }}
              />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
