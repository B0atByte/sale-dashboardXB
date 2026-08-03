import { useLang } from "../i18n";
import { platformColor, ONLINE_LOCATION } from "../utils/data";

/**
 * แถบแท็บช่องทาง (ใช้บนจอเล็กแทน Sidebar):
 * "ภาพรวม" + ช่องทาง แยกกลุ่ม ออนไลน์ / หน้าร้าน
 */
export default function PlatformTabs({ platforms = [], active = "", onSelect, locations = [], showOverview = true }) {
  const { t } = useLang();
  const storeSet = new Set(locations.filter((l) => l && l !== ONLINE_LOCATION));
  const onlinePlatforms = platforms.filter((p) => !storeSet.has(p));
  const storePlatforms = platforms.filter((p) => storeSet.has(p));

  const tab = (name, label, color) => {
    const isActive = (active || "") === name;
    return (
      <button
        key={name || "overview"}
        type="button"
        onClick={() => onSelect(name)}
        className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
          isActive
            ? "bg-slate-800 text-white shadow-lg shadow-slate-200"
            : "border border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        {name && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        )}
        {label}
      </button>
    );
  };

  const groupTag = "flex shrink-0 items-center text-[9px] font-black uppercase tracking-[2px] text-slate-300";

  return (
    <div className="thin-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      {showOverview && tab("", t("nav.overview"), "#4f46e5")}
      {storePlatforms.length > 0 && (
        <>
          <span className={groupTag}>{t("nav.groupStore")}</span>
          {storePlatforms.map((p) => tab(p, p, platformColor(p)))}
        </>
      )}
      {onlinePlatforms.length > 0 && (
        <>
          <span className={groupTag}>{t("nav.groupOnline")}</span>
          {onlinePlatforms.map((p) => tab(p, p, platformColor(p)))}
        </>
      )}
    </div>
  );
}
