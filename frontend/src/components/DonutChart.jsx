import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLang } from "../i18n";
import ToggleGroup from "./ToggleGroup";
import { scopeLatest } from "../utils/data";
import { formatCurrency, formatCompactCurrency, formatNumber } from "../utils/format";

/**
 * โดนัทชาร์ต + แถบ toggle (ปี/เดือน/วัน + ยอดขาย/ชิ้น) + legend + ยอดรวมตรงกลาง
 * - โหมดใหม่: ส่ง records + build(records, metric, t) มา แล้วการ์ดจะคิดเองตาม toggle
 *   ปี/เดือน/วัน = ดูสัดส่วนของ "ช่วงล่าสุด" (ปี/เดือน/วันล่าสุดของข้อมูลที่กรองอยู่)
 * - โหมดเดิม: ส่ง data มาตรง ๆ (ไม่มี toggle)
 */
export default function DonutChart({ title, subtitle, data: dataProp, records, build }) {
  const { t } = useLang();
  const [gran, setGran] = useState("year");
  const [metric, setMetric] = useState("gmv");
  const hasToggle = Boolean(build && records);

  const data = useMemo(() => {
    if (!hasToggle) return dataProp || [];
    return build(scopeLatest(records, gran), metric, t);
  }, [hasToggle, dataProp, build, records, gran, metric, t]);

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const isUnits = hasToggle && metric === "units";
  const fmtVal = (v) => (isUnits ? `${formatNumber(v)} ${t("trend.units")}` : formatCurrency(v));
  const fmtTotal = (v) => (isUnits ? formatNumber(v) : formatCompactCurrency(v));

  return (
    <section className="flex h-full flex-col rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      {/* หัวการ์ด: ชื่อกับ toggle อยู่บรรทัดเดียวกัน (จัดกึ่งกลางแนวตั้งของหัวข้อ) — คำบรรยายลงไปอยู่ใต้หัวข้อ */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-2xl font-bold tracking-tighter text-slate-800">
            {title}
          </h2>
          {hasToggle && (
            /* ml-auto: ชิดขวาเสมอ */
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
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <p className="flex-1 py-16 text-center text-sm text-slate-400">
          {t("chart.noData")}
        </p>
      ) : (
        <>
          {/* พื้นที่กราฟยืดเต็มช่องที่เหลือ แล้วจัดโดนัทกึ่งกลาง
              → การ์ดที่มีรายการน้อยจะไม่เหลือช่องโบ๋ด้านล่าง และ legend ชิดล่างเท่ากันทั้งสองการ์ด */}
          <div className="flex flex-1 items-center justify-center">
            <div className="relative mx-auto h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                    label={renderLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip total={total} t={t} fmt={fmtVal} />} />
                </PieChart>
              </ResponsiveContainer>
              {/* ยอดรวมตรงกลางโดนัท */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t("chart.total")}
                </span>
                <span className="text-xl font-bold tracking-tight text-slate-800">
                  {fmtTotal(total)}
                </span>
              </div>
            </div>
          </div>

          {/* legend rows — ชิดขอบล่างของการ์ดเสมอ */}
          <div className="mt-4 flex flex-col gap-2">
            {data.map((d) => {
              const p = total > 0 ? (d.value / total) * 100 : 0;
              return (
                <div
                  key={d.name}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span
                      className="truncate text-[10px] font-black uppercase tracking-widest text-slate-700"
                      title={d.name}
                    >
                      {d.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-800">
                      {fmtVal(d.value)}
                    </span>
                    <span className="min-w-[3rem] rounded-md bg-indigo-50/70 px-2 py-1 text-center text-[10px] font-black text-indigo-600">
                      {p.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/** วาด label % เฉพาะชิ้นที่ >= 8% */
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.08) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="11"
      fontWeight="700"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DonutTooltip({ active, payload, total, t, fmt = formatCurrency }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const p = total > 0 ? (d.value / total) * 100 : 0;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: d.color }}
        />
        <span className="text-xs font-bold text-slate-700">{d.name}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-slate-800">
        {fmt(d.value)}
      </p>
      <p className="text-[11px] font-bold text-slate-400">
        {p.toFixed(1)}% {t("chart.ofTotal")}
        {d.orders != null ? ` · ${d.orders} ${t("chart.orders")}` : ""}
      </p>
    </div>
  );
}
