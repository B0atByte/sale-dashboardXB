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
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.chip}`}
              >
                <c.Icon className="h-[18px] w-[18px]" />
              </span>
              <span
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500"
                title={c.cross ? t("exec.crossShare") : t("exec.share")}
              >
                {c.cross ? "≈ " : ""}
                {pct.toFixed(1)}%
              </span>
            </div>

            <h3 className="mt-4 text-sm font-medium text-slate-500">{c.label}</h3>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(c.data.gmv)}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">{c.sub}</p>

            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="tabular-nums">
                {formatNumber(c.data.orders)} {t("exec.orders")}
              </span>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">
                {formatNumber(c.data.units)} {t("exec.units")}
              </span>
            </div>

            {/* แถบสัดส่วนบาง ๆ ด้านล่างการ์ด */}
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
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
