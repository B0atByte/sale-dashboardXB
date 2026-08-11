import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLang } from "../i18n";
import { monthlyGroupTrend } from "../utils/data";
import { formatCurrency, formatCompact, formatNumber } from "../utils/format";

/** ป้ายแกนเดือน "2026-07" -> "ก.ค. 69" / "Jul 26" */
function monthLabel(key, lang) {
  const d = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { month: "short", year: "2-digit" });
}

// 4 เส้น: รวม / เครื่อง / เมล็ด / อุปกรณ์เสริม (สีคงที่)
const SERIES = [
  { key: "total", labelKey: "group.total", color: "#0f172a" },
  { key: "machine", labelKey: "group.machine", color: "#4f46e5" },
  { key: "beans", labelKey: "group.beans", color: "#059669" },
  { key: "accessories", labelKey: "group.accessories", color: "#d97706" },
];

/**
 * กราฟแนวโน้มรายเดือน 4 เส้น (Total / Machine / Beans / Accessories)
 * metric = "gmv" (ยอดขาย ฿) หรือ "units" (จำนวนชิ้น)
 */
export default function MultiTrendChart({ records = [], metric = "gmv", title, subtitle }) {
  const { t, lang } = useLang();
  const data = useMemo(
    () => monthlyGroupTrend(records, metric).map((d) => ({ ...d, label: monthLabel(d.key, lang) })),
    [records, metric, lang]
  );

  const isGmv = metric === "gmv";
  const fmtY = (v) => (isGmv ? formatCompact(v) : formatNumber(v));
  const fmtVal = (v) => (isGmv ? formatCurrency(v) : `${formatNumber(v)} ${t("trend.units")}`);

  const tooltip = ({ active, payload }) =>
    active && payload && payload.length ? (
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg">
        <p className="mb-1 text-xs font-bold text-slate-700">{payload[0]?.payload?.label}</p>
        {SERIES.map((s) => {
          const p = payload.find((x) => x.dataKey === s.key);
          return (
            <p key={s.key} className="flex items-center justify-between gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5" style={{ color: s.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {t(s.labelKey)}
              </span>
              <span className="tabular-nums text-slate-700">{fmtVal(p ? p.value : 0)}</span>
            </p>
          );
        })}
      </div>
    ) : null;

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tighter text-slate-800">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">{subtitle}</p>
        )}
      </div>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">{t("trend.needMore")}</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={tooltip} />
              <Legend
                iconType="plainline"
                formatter={(v) => {
                  const s = SERIES.find((x) => x.key === v);
                  return <span className="text-xs font-bold text-slate-600">{s ? t(s.labelKey) : v}</span>;
                }}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.key}
                  stroke={s.color}
                  strokeWidth={s.key === "total" ? 2.5 : 2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
