import { useLang } from "../i18n";
import { IconRefresh } from "./Icons";

/**
 * ป้ายลอย "กำลังดึงข้อมูล: <ช่องทาง>" + สปินเนอร์
 * โผล่ตอนผู้ใช้เปลี่ยนช่องทาง/ตัวกรอง หรือกดรีเฟรชเอง
 * (การรีเฟรชเบื้องหลังทุก 20 วิ จะเงียบ ไม่โชว์ป้ายนี้)
 */
export default function LoadingBadge({ label }) {
  const { t } = useLang();
  return (
    <div className="fade-in pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2 px-4">
      <div className="flex items-center gap-2.5 rounded-full border border-slate-100 bg-white px-4 py-2.5 shadow-lg shadow-slate-300/40">
        <IconRefresh className="h-4 w-4 animate-spin text-indigo-600" />
        <span className="text-xs font-bold text-slate-700">
          {t("loading.fetching")}
          {label ? `: ${label}` : ""}
        </span>
      </div>
    </div>
  );
}
