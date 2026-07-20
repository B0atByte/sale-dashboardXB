import { useLang } from "../i18n";

/**
 * โครงหน้าจอระหว่างโหลดข้อมูลครั้งแรก (skeleton) — มุมโค้งเข้าธีมการ์ดจริง
 */
export default function LoadingSkeleton() {
  const { t } = useLang();
  return (
    <div className="space-y-6" aria-label={t("loading")} role="status">
      {/* การ์ด KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100"
          />
        ))}
      </div>

      {/* กราฟสองคอลัมน์ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
        <div className="h-96 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
      </div>

      {/* กราฟแนวโน้ม + ตาราง */}
      <div className="h-80 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />

      <p className="text-center text-xs font-black uppercase tracking-widest text-slate-400">
        {t("loading")}
      </p>
    </div>
  );
}
