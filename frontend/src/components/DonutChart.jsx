import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLang } from "../i18n";
import { formatCurrency, formatCompactCurrency } from "../utils/format";

/**
 * โดนัทชาร์ต + legend rows ด้านล่าง + ยอดรวมตรงกลาง
 * data: [{ name, value, color, orders? }]  (name แปลภาษามาแล้วจากผู้เรียก)
 * title/subtitle รับเป็น prop (ผู้เรียกแปลภาษาให้)
 */
export default function DonutChart({ title, subtitle, data = [] }) {
  const { t } = useLang();
  const total = data.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tighter text-slate-800">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {t("chart.noData")}
        </p>
      ) : (
        <>
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
                <Tooltip content={<DonutTooltip total={total} t={t} />} />
              </PieChart>
            </ResponsiveContainer>
            {/* ยอดรวมตรงกลางโดนัท */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t("chart.total")}
              </span>
              <span className="text-xl font-bold tracking-tight text-slate-800">
                {formatCompactCurrency(total)}
              </span>
            </div>
          </div>

          {/* legend rows */}
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
                      {formatCurrency(d.value)}
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

function DonutTooltip({ active, payload, total, t }) {
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
        {formatCurrency(d.value)}
      </p>
      <p className="text-[11px] font-bold text-slate-400">
        {p.toFixed(1)}% {t("chart.ofTotal")}
        {d.orders != null ? ` · ${d.orders} ${t("chart.orders")}` : ""}
      </p>
    </div>
  );
}
