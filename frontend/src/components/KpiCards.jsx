import { useLang } from "../i18n";
import Sparkline from "./Sparkline";
import { formatCurrency, formatNumber } from "../utils/format";
import { metricSpark } from "../utils/data";
import { IconTrendUp, IconTrendDown } from "./Icons";

/** % การเปลี่ยนแปลงเทียบช่วงก่อนหน้า */
function pct(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

/** ป้ายเทียบช่วงก่อนหน้า — แสดงเฉพาะเมื่อมีข้อมูลช่วงก่อนหน้าจริง */
function ComparePill({ curr, prev }) {
  const { t } = useLang();
  const p = pct(curr || 0, prev || 0);
  const up = p >= 0;
  return (
    <div
      className={`mt-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
        up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
      }`}
      title={t("kpi.compareTitle")}
    >
      {up ? (
        <IconTrendUp className="h-3 w-3" />
      ) : (
        <IconTrendDown className="h-3 w-3" />
      )}
      {t("kpi.comparePrev")} {up ? "+" : ""}
      {p.toFixed(1)}%
    </div>
  );
}

/**
 * การ์ดตัวเลขสำคัญ 4 ใบ จาก /api/sales/summary (kpi)
 * - sparkline คำนวณจากยอดขายรายวันจริง (ซ่อนถ้าข้อมูล < 2 วัน)
 * - ป้ายเทียบช่วงก่อนหน้าแสดงเฉพาะเมื่อกรองช่วงวันที่ (comparison != null)
 */
export default function KpiCards({ kpi, records = [], comparison }) {
  const { t } = useLang();
  const gmvSpark = metricSpark(records, "gmv");
  const orderSpark = metricSpark(records, "orders");
  const unitSpark = metricSpark(records, "units");

  const cards = [
    {
      label: t("kpi.gmv"),
      value: formatCurrency(kpi?.totalGmv),
      spark: gmvSpark,
      curr: kpi?.totalGmv,
      prev: comparison?.totalGmv,
    },
    {
      label: t("kpi.orders"),
      value: formatNumber(kpi?.totalOrders),
      spark: orderSpark,
      curr: kpi?.totalOrders,
      prev: comparison?.totalOrders,
    },
    {
      label: t("kpi.units"),
      value: formatNumber(kpi?.totalUnits),
      spark: unitSpark,
      curr: kpi?.totalUnits,
      prev: comparison?.totalUnits,
    },
    {
      label: t("kpi.aov"),
      value: formatCurrency(kpi?.aov),
      spark: gmvSpark,
      curr: kpi?.aov,
      prev: comparison?.aov,
    },
  ];

  return (
    <section
      aria-label={t("kpi.gmv")}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="group flex flex-col rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="flex items-start justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {c.label}
            </h3>
            <div className="opacity-20 transition-opacity group-hover:opacity-60">
              <Sparkline data={c.spark || []} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-800 lg:text-4xl">
            {c.value}
          </p>
          {comparison && Number.isFinite(c.prev) && (
            <ComparePill curr={c.curr} prev={c.prev} />
          )}
        </div>
      ))}
    </section>
  );
}
