import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLang } from "../i18n";
import { dailySeries } from "../utils/data";
import {
  formatCurrency,
  formatCompact,
  formatShortDate,
  formatDate,
} from "../utils/format";

/**
 * กราฟพื้นที่แนวโน้มยอดขายรายวัน (ซีรีส์เดียว → ไม่มี legend, ชื่อกราฟบอกอยู่แล้ว)
 * แกนเดียว (GMV) เท่านั้น
 */
export default function TrendChart({ records = [] }) {
  const { t, lang } = useLang();
  const data = dailySeries(records);

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tighter text-slate-800">
          {t("trend.title")}
        </h2>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t("trend.sub")}
        </p>
      </div>

      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {t("trend.needMore")}
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatShortDate(v, lang)}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(v)}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                content={<TrendTooltip lang={lang} t={t} />}
                cursor={{ stroke: "#c7d2fe", strokeWidth: 1.5 }}
              />
              <Area
                type="monotone"
                dataKey="gmv"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#gmvGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function TrendTooltip({ active, payload, lang, t }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-bold text-slate-700">
        {formatDate(d.date, lang)}
      </p>
      <p className="mt-1 text-sm font-bold text-indigo-600">
        {formatCurrency(d.gmv)}
      </p>
      <p className="text-[11px] font-bold text-slate-400">
        {d.orders} {t("chart.orders")}
      </p>
    </div>
  );
}
