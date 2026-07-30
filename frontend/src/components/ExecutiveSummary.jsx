import { useMemo } from "react";
import { useLang } from "../i18n";
import { execSummaryFrom } from "../utils/data";
import { formatCurrency, formatNumber } from "../utils/format";
import { IconGlobe, IconBuilding, IconCoffee } from "./Icons";

/**
 * สรุปผู้บริหาร 3 กล่อง (แสดงบนสุดของหน้าภาพรวม)
 * 1) ยอดออนไลน์รวม (ทุกช่องทาง ยกเว้น Central World)
 * 2) Central World (เฉพาะสาขา)
 * 3) ยอดเมล็ดกาแฟ (Beans/Export) — รวมออนไลน์ + หน้าร้าน
 * คิดจาก records ที่กรองอยู่ (เคารพช่วงวันที่/ตัวกรอง)
 */
export default function ExecutiveSummary({ records = [] }) {
  const { t } = useLang();
  const { online, central, beans } = useMemo(
    () => execSummaryFrom(records),
    [records]
  );

  const grand = online.gmv + central.gmv;
  const share = (v) => (grand > 0 ? (v / grand) * 100 : 0);

  const cards = [
    {
      key: "online",
      label: t("exec.online"),
      sub: t("exec.onlineSub"),
      data: online,
      Icon: IconGlobe,
      ring: "ring-indigo-100",
      chip: "bg-indigo-50 text-indigo-600",
      bar: "bg-indigo-500",
    },
    {
      key: "central",
      label: t("exec.central"),
      sub: t("exec.centralSub"),
      data: central,
      Icon: IconBuilding,
      ring: "ring-pink-100",
      chip: "bg-pink-50 text-pink-600",
      bar: "bg-pink-500",
    },
    {
      key: "beans",
      label: t("exec.beans"),
      sub: t("exec.beansSub"),
      data: beans,
      Icon: IconCoffee,
      ring: "ring-amber-100",
      chip: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      cross: true, // เป็นสัดส่วนไขว้ (subset) ไม่ใช่ส่วนแบ่งของยอดรวม
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((c) => {
        const pct = share(c.data.gmv);
        return (
          <div
            key={c.key}
            className={`group relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm ring-1 ${c.ring} transition-all hover:-translate-y-1 hover:shadow-xl`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {c.label}
                </h3>
                <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                  {c.sub}
                </p>
              </div>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${c.chip}`}
              >
                <c.Icon className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-800 lg:text-[2.6rem] lg:leading-none">
              {formatCurrency(c.data.gmv)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
              <span>
                {formatNumber(c.data.orders)} {t("exec.orders")}
              </span>
              <span className="text-slate-300">·</span>
              <span>
                {formatNumber(c.data.units)} {t("exec.units")}
              </span>
              <span
                className={`ml-auto rounded-md px-2 py-1 text-[10px] font-black ${c.chip}`}
                title={c.cross ? t("exec.crossShare") : t("exec.share")}
              >
                {c.cross ? "≈ " : ""}
                {pct.toFixed(1)}%
              </span>
            </div>

            {/* แถบสัดส่วนบาง ๆ ด้านล่างการ์ด */}
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${c.bar}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
