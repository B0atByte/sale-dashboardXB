import { useLang } from "../i18n";
import Sparkline from "./Sparkline";
import { formatCurrency, formatNumber } from "../utils/format";
import { metricSpark } from "../utils/data";
import { IconTrendUp, IconTrendDown } from "./Icons";

/** ย่อค่าตัวเลขแบบเดียวกับไฟล์เดิม (k.boat): >=1M -> x.xxM, >=1k -> x.xk */
function formatVal(num) {
  if (!num) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (num / 1_000).toFixed(1) + "k";
  return Number(num.toFixed(0)).toLocaleString("en-US");
}

/**
 * แท็บเทียบ 1 อัน (VS LY / VS LM / VS LW (ปี → เดือน → สัปดาห์)) — รูปแบบเดียวกับ k.boat:
 * ป้าย % (เขียว/แดง + ลูกศร) + Prev: (ค่าก่อนหน้า) + Diff: (ส่วนต่าง +/−)
 */
function ComparisonTag({ label, currentValue, prevValue, prefix = "" }) {
  if (prevValue == null) return null;
  const curr = currentValue || 0;
  const prev = prevValue || 0;
  const diff = curr - prev;
  const pct = prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  const isPos = pct >= 0;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-100/50 bg-slate-50 p-2.5 transition-all hover:bg-white">
      <span className="text-[9px] font-bold uppercase tracking-tight text-slate-400">{label}</span>
      <div
        className={`flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
          isPos ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        }`}
      >
        {isPos ? (
          <IconTrendUp className="mr-0.5 h-2.5 w-2.5" />
        ) : (
          <IconTrendDown className="mr-0.5 h-2.5 w-2.5" />
        )}
        {Math.abs(pct).toFixed(1)}%
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        <div className="flex justify-between text-[9px]">
          <span className="text-slate-400">Prev:</span>
          <span className="font-bold text-slate-600">
            {prefix}
            {formatVal(prev)}
          </span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-slate-400">Diff:</span>
          <span className={`font-bold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
            {isPos ? "+" : ""}
            {prefix}
            {formatVal(diff)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * การ์ด KPI — ยอดขายรวม / ออเดอร์ / ชิ้น / AIV
 * ใต้แต่ละใบมี 3 แท็บเทียบ (VS LY / VS LM / VS LW (ปี → เดือน → สัปดาห์)) แบบ Prev: / Diff: เหมือนไฟล์เดิม
 */
export default function KpiCards({ kpi, records = [], comparisons }) {
  const { t } = useLang();
  const gmvSpark = metricSpark(records, "gmv");
  const orderSpark = metricSpark(records, "orders");
  const unitSpark = metricSpark(records, "units");

  const cards = [
    { label: t("kpi.gmv"), value: formatCurrency(kpi?.totalGmv), spark: gmvSpark, metric: "totalGmv", curr: kpi?.totalGmv, prefix: "฿" },
    { label: t("kpi.orders"), value: formatNumber(kpi?.totalOrders), spark: orderSpark, metric: "totalOrders", curr: kpi?.totalOrders, prefix: "" },
    { label: t("kpi.units"), value: formatNumber(kpi?.totalUnits), spark: unitSpark, metric: "totalUnits", curr: kpi?.totalUnits, prefix: "" },
    { label: t("kpi.aov"), value: formatCurrency(kpi?.aov), spark: gmvSpark, metric: "aov", curr: kpi?.aov, prefix: "฿" },
    { label: t("kpi.aiv"), value: formatCurrency(kpi?.aiv), spark: gmvSpark, metric: "aiv", curr: kpi?.aiv, prefix: "฿" },
    { label: t("kpi.net"), value: formatCurrency(kpi?.totalNetRevenue), spark: gmvSpark, metric: "totalNetRevenue", curr: kpi?.totalNetRevenue, prefix: "฿" },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="group flex flex-col rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-start justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">{c.label}</h3>
            <div className="opacity-20 transition-opacity group-hover:opacity-60">
              <Sparkline data={c.spark || []} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-800 lg:text-4xl">{c.value}</p>
          {comparisons && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-50 pt-4">
              <ComparisonTag label="VS LY" currentValue={c.curr} prevValue={comparisons.ly?.[c.metric]} prefix={c.prefix} />
              <ComparisonTag label="VS LM" currentValue={c.curr} prevValue={comparisons.lm?.[c.metric]} prefix={c.prefix} />
              <ComparisonTag label="VS LW" currentValue={c.curr} prevValue={comparisons.lw?.[c.metric]} prefix={c.prefix} />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
