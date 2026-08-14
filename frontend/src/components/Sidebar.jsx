import { useState } from "react";
import { useLang } from "../i18n";
import { useSettings } from "../settings";
import { platformColor, ONLINE_LOCATION } from "../utils/data";
import { IconActivity, IconGrid, IconCoffee, IconBuilding, IconTrendUp } from "./Icons";
import { APP_VERSION } from "../version";

/**
 * แถบเมนูด้านซ้าย (sidebar) — แสดงเฉพาะจอใหญ่ (lg ขึ้นไป)
 * บนจอเล็กจะซ่อนไว้ แล้วใช้ <PlatformTabs> แนวนอนแทน
 *
 * รายการเมนู = "ภาพรวม" + หนึ่งรายการต่อช่องทาง
 * เลือกเมนู = ตั้งค่าตัวกรอง platform ("ภาพรวม" = ค่าว่าง = ไม่กรองช่องทาง)
 * ลากช่องทางเพื่อจัดลำดับเองได้ (ผ่าน onReorder)
 */
export default function Sidebar({ platforms = [], active = "", onSelect, onReorder, showLog, onOpenLog, view = "dashboard", onChangeView, locations = [], showOverview = true, views }) {
  // มุมมองเสริมที่เห็นได้ (Set) — ไม่ส่งมา = เห็นครบ (กันพลาด), dashboard เห็นได้เสมอ
  const viewSet = views instanceof Set ? views : new Set(["menu", "xbloom", "executive"]);
  const { t } = useLang();
  const { settings } = useSettings();
  const [dragName, setDragName] = useState(null);
  const [overName, setOverName] = useState(null);

  // ช่องทางที่เป็น "หน้าร้าน" = ชื่อ platform ตรงกับ location สาขา (ชีตเสริม); ที่เหลือ = ออนไลน์
  const storeSet = new Set(locations.filter((l) => l && l !== ONLINE_LOCATION));
  const onlinePlatforms = platforms.filter((p) => !storeSet.has(p));
  const storePlatforms = platforms.filter((p) => storeSet.has(p));

  const handleDrop = (targetName) => {
    setOverName(null);
    if (!onReorder || !dragName || dragName === targetName) return;
    const arr = [...platforms];
    const from = arr.indexOf(dragName);
    const to = arr.indexOf(targetName);
    if (from < 0 || to < 0) return;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    onReorder(arr);
    setDragName(null);
  };

  /** ปุ่มช่องทาง 1 รายการ (ใช้ทั้ง ภาพรวม / ออนไลน์ / หน้าร้าน) */
  const renderItem = (item) => {
    // ช่องทางจะ active ก็ต่อเมื่ออยู่หน้า dashboard และเลือกช่องนั้นอยู่ (ทั้ง sidebar active ทีละปุ่มเดียว)
    // "ภาพรวม" (name="") ไม่โชว์ active — ให้ปุ่ม "แดชบอร์ด" เป็นตัวบอกสถานะ overview
    const isActive = view === "dashboard" && Boolean(item.name) && (active || "") === item.name;
    const canDrag = Boolean(item.name) && Boolean(onReorder);
    return (
      <button
        key={item.name || "overview"}
        type="button"
        draggable={canDrag}
        onDragStart={canDrag ? () => setDragName(item.name) : undefined}
        onDragEnter={canDrag ? () => setOverName(item.name) : undefined}
        onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
        onDrop={canDrag ? (e) => { e.preventDefault(); handleDrop(item.name); } : undefined}
        onDragEnd={() => { setDragName(null); setOverName(null); }}
        onClick={() => onSelect(item.name)}
        className={`group/nav flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] ${
          isActive
            ? "bg-slate-800 text-white shadow-lg shadow-slate-200"
            : "text-slate-500 hover:bg-slate-50"
        } ${dragName === item.name ? "opacity-40" : ""} ${
          overName === item.name && dragName !== item.name ? "ring-2 ring-indigo-300" : ""
        }`}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="truncate">{item.label}</span>
        {canDrag && (
          <span
            className={`ml-auto shrink-0 cursor-grab select-none text-[13px] leading-none opacity-0 transition group-hover/nav:opacity-100 ${
              isActive ? "text-slate-400" : "text-slate-300"
            }`}
            title={t("nav.dragHint")}
          >
            ⠿
          </span>
        )}
      </button>
    );
  };

  const groupLabel = "px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400";
  const subLabel = "px-3 pb-1 pt-2 text-[9px] font-black uppercase tracking-[2px] text-slate-300";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white lg:flex">
      {/* แบรนด์ */}
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

      {/* เมนูช่องทาง */}
      <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-2">
        {/* สลับมุมมอง: แดชบอร์ด / เมนูหน้าร้าน */}
        {onChangeView && (
          <>
            <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t("nav.views")}
            </p>
            {[
              { v: "dashboard", label: t("nav.dashboard"), Icon: IconGrid },
              { v: "menu", label: t("nav.mainMenu"), Icon: IconCoffee },
              { v: "xbloom", label: t("nav.xbloomView"), Icon: IconBuilding },
              { v: "executive", label: t("nav.executive"), Icon: IconTrendUp },
            ].filter((it) => it.v === "dashboard" || viewSet.has(it.v)).map((it) => {
              // "แดชบอร์ด" = overview → active เฉพาะตอนอยู่ dashboard และไม่ได้เลือกช่องทาง
              // (ถ้าเลือกช่องทาง ให้ปุ่มช่องทางนั้น active แทน — ทั้ง sidebar active ทีละปุ่มเดียว)
              const on = it.v === "dashboard" ? view === "dashboard" && !active : view === it.v;
              return (
                <button
                  key={it.v}
                  type="button"
                  onClick={() => onChangeView(it.v)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] ${
                    on ? "bg-slate-800 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <it.Icon className={`h-4 w-4 shrink-0 ${on ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{it.label}</span>
                </button>
              );
            })}
          </>
        )}

        <p className={groupLabel}>{t("nav.section")}</p>

        {/* "ภาพรวม" ถูกลบออก — ซ้ำกับปุ่ม "แดชบอร์ด" (กดแดชบอร์ด = ดูภาพรวมทุกช่องทาง) */}

        {/* กลุ่มหน้าร้าน (ไว้บน) */}
        {storePlatforms.length > 0 && (
          <>
            <p className={subLabel}>{t("nav.groupStore")}</p>
            {storePlatforms.map((p) =>
              renderItem({ name: p, label: p, color: platformColor(p) })
            )}
          </>
        )}

        {/* กลุ่มออนไลน์ */}
        {onlinePlatforms.length > 0 && (
          <>
            <p className={subLabel}>{t("nav.groupOnline")}</p>
            {onlinePlatforms.map((p) =>
              renderItem({ name: p, label: p, color: platformColor(p) })
            )}
          </>
        )}
      </nav>

      {/* ปุ่ม Log กิจกรรม (เฉพาะ itsupport) */}
      {showLog && (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={onOpenLog}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-50"
          >
            <IconActivity className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{t("nav.activityLog")}</span>
          </button>
        </div>
      )}

      {/* ท้าย sidebar */}
      <div className="border-t border-slate-100 px-6 py-4">
        <p className="text-[10px] font-bold text-slate-400">{settings.brandFooter}</p>
        <p className="mt-0.5 text-[10px] font-bold tracking-wider text-slate-300">v{APP_VERSION}</p>
      </div>
    </aside>
  );
}
