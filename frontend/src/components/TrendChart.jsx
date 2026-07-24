import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLang } from "../i18n";
import ToggleGroup from "./ToggleGroup";
import { aggregateTrend } from "../utils/data";
import {
  formatCurrency,
  formatCompact,
  formatNumber,
  formatShortDate,
} from "../utils/format";

/** ป้ายแกน X ตามความละเอียด */
function labelFor(key, gran, lang) {
  if (gran === "year") return key; // "2026"
  if (gran === "month") {
    const d = new Date(`${key}-01T00:00:00`);
    return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", {
      month: "short",
      year: "2-digit",
    });
  }
  return formatShortDate(key, lang); // day
}

/**
 * กราฟแนวโน้ม — เลือกความละเอียด (ปี/เดือน/วัน) และเมตริก (ยอดขาย/ชิ้น)
 */
export default function TrendChart({ records = [] }) {
  const { t, lang } = useLang();
  const [gran, setGran] = useState("day");
  const [metric, setMetric] = useState("gmv");

  const data = aggregateTrend(records, gran, metric).map((d) => ({
    ...d,
    label: labelFor(d.key, gran, lang),
  }));

  const fmtY = (v) => (metric === "gmv" ? formatCompact(v) : formatNumber(v));
  const fmtVal = (v) =>
    metric === "gmv" ? formatCurrency(v) : `${formatNumber(v)} ${t("trend.units")}`;

  const trendTooltip = ({ active, payload }) =>
    active && payload && payload.length ? (
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg">
        <p className="text-xs font-bold text-slate-700">{payload[0].payload.label}</p>
        <p className="mt-1 text-sm font-bold text-indigo-600">{fmtVal(payload[0].payload.value)}</p>
      </div>
    ) : null;

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      {/* หัวการ์ด: ชื่อกับ toggle อยู่บรรทัดเดียวกัน — คำบรรยายลงไปอยู่ใต้หัวข้อ */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-2xl font-bold tracking-tighter text-slate-800">
            {t("trend.title")}
          </h2>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ToggleGroup
              value={gran}
              onChange={setGran}
              options={[
                { v: "year", label: t("trend.year") },
                { v: "month", label: t("trend.month") },
                { v: "day", label: t("trend.day") },
              ]}
            />
            <ToggleGroup
              value={metric}
              onChange={setMetric}
              options={[
                { v: "gmv", label: `${t("trend.gmv")} (฿)` },
                { v: "units", label: `${t("trend.units")} (pcs)` },
              ]}
            />
          </div>
        </div>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          {metric === "gmv" ? t("trend.sub") : t("trend.subUnits")}
        </p>
      </div>

      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">{t("trend.needMore")}</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {data.length === 1 ? (
              // มีข้อมูลแค่ช่วงเดียว (เช่นวันเดียว) → แสดงเป็นแท่งเดียว ไม่ต้อง blank
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ fill: "#eef2ff" }} content={trendTooltip} />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={72} isAnimationActive={false} />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{ stroke: "#c7d2fe", strokeWidth: 1.5 }} content={trendTooltip} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#trendGrad)" isAnimationActive={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
