import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLang } from "../i18n";
import DonutChart from "./DonutChart";
import { isMachine, machineColorOf, isCentralWorld, aggregateTrend } from "../utils/data";
import { formatNumber } from "../utils/format";
import { IconRefresh, IconGrid } from "./Icons";

// เริ่มนับตั้งแต่ ก.ค. 2026 (ตามโจทย์)
const START = "2026-07-01";
const BEAN_TEA = ["beans", "xpod", "tea", "sachet"];
const isBeanTea = (r) => BEAN_TEA.includes(String(r.category || "").trim().toLowerCase());

/** ป้ายแกนเดือน "2026-07" -> "ก.ค. 69" / "Jul 26" */
function monthLabel(key, lang) {
  const d = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { month: "short", year: "2-digit" });
}

/** กราฟแท่งรายเดือน (จำนวนชิ้น) */
function MonthlyBar({ data, color = "#6366f1", lang, unit }) {
  const { t } = useLang();
  if (!data.length) {
    return <p className="py-16 text-center text-sm text-slate-400">{t("trend.needMore")}</p>;
  }
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.key, lang) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: "#eef2ff" }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg">
                  <p className="text-xs font-bold text-slate-700">{payload[0].payload.label}</p>
                  <p className="mt-1 text-sm font-bold text-indigo-600">
                    {formatNumber(payload[0].payload.value)} {unit}
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} maxBarSize={56} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * หน้า "xBloom View" — ภาพรวมการขายเครื่อง xBloom (+ เมล็ด) ตั้งแต่ ก.ค. 2026
 * - จำนวนเครื่องที่ขายแต่ละเดือน
 * - สัดส่วนยอดขายเครื่องตามสี (โดนัท)
 * - สัดส่วนเครื่องตามช่องทาง B2B / ออนไลน์ / CTW (โดนัท)
 * - จำนวนเมล็ดที่ขายทุกประเภทแต่ละเดือน
 */
export default function XBloomView() {
  const { t, lang } = useLang();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = (force = false) => {
    setLoading(true);
    setError(false);
    fetch(`/api/sales${force ? "?fresh=1" : ""}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setRecords((d.records ?? []).filter((r) => String(r.date || "") >= START)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const machines = useMemo(() => records.filter(isMachine), [records]);
  const beans = useMemo(() => records.filter(isBeanTea), [records]);

  const machineUnits = useMemo(() => machines.reduce((s, r) => s + (r.quantity || 0), 0), [machines]);
  const beanUnits = useMemo(() => beans.reduce((s, r) => s + (r.quantity || 0), 0), [beans]);

  const machineByMonth = useMemo(() => aggregateTrend(machines, "month", "units"), [machines]);
  const beanByMonth = useMemo(() => aggregateTrend(beans, "month", "units"), [beans]);

  // โดนัทสีเครื่อง (นับจำนวนชิ้น)
  const colorDonut = useMemo(() => {
    const map = new Map();
    for (const r of machines) {
      const c = machineColorOf(r);
      const name = c ? c.label : t("common.other");
      const color = c ? c.color : "#64748b";
      const cur = map.get(name) || { name, value: 0, color };
      cur.value += r.quantity || 0;
      map.set(name, cur);
    }
    return [...map.values()].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  }, [machines, t]);

  // โดนัทช่องทางเครื่อง: B2B / ออนไลน์ / CTW
  const channelDonut = useMemo(() => {
    const buckets = {
      ctw: { name: t("xbloom.ctw"), value: 0, color: "#db2777" },
      b2b: { name: t("xbloom.b2b"), value: 0, color: "#e11d48" },
      online: { name: t("xbloom.online"), value: 0, color: "#4f46e5" },
    };
    for (const r of machines) {
      const q = r.quantity || 0;
      if (isCentralWorld(r)) buckets.ctw.value += q;
      else if (String(r.platform || "").trim().toLowerCase() === "b2b") buckets.b2b.value += q;
      else buckets.online.value += q;
    }
    return Object.values(buckets).filter((d) => d.value > 0);
  }, [machines, t]);

  const card = "rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm";

  if (loading && !records.length) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
          <div className="h-80 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
        </div>
      </div>
    );
  }
  if (error) {
    return <div className={`${card} py-16 text-center text-sm font-bold text-slate-400`}>{t("error.load")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* หัวเรื่อง + KPI */}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <IconGrid className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tighter text-slate-800">{t("xbloom.title")}</h2>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("xbloom.sub")}</p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            title={t("header.refresh")}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-indigo-600 active:scale-95 disabled:opacity-50"
          >
            <IconRefresh className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("xbloom.machines")}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-800">
              {formatNumber(machineUnits)} {t("xbloom.unitMachine")}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("xbloom.beans")}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-800">
              {formatNumber(beanUnits)} {t("xbloom.unitPcs")}
            </p>
          </div>
        </div>
      </section>

      {/* เครื่องรายเดือน */}
      <section className={card}>
        <h3 className="mb-1 text-2xl font-bold tracking-tighter text-slate-800">{t("xbloom.machinesMonthly")}</h3>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t("xbloom.since")}</p>
        <MonthlyBar data={machineByMonth} color="#4f46e5" lang={lang} unit={t("xbloom.unitMachine")} />
      </section>

      {/* โดนัท 2 คอลัมน์: สีเครื่อง + ช่องทาง */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutChart title={t("xbloom.byColor")} subtitle={t("xbloom.byColorSub")} data={colorDonut} />
        <DonutChart title={t("xbloom.byChannel")} subtitle={t("xbloom.byChannelSub")} data={channelDonut} />
      </div>

      {/* เมล็ดรายเดือน */}
      <section className={card}>
        <h3 className="mb-1 text-2xl font-bold tracking-tighter text-slate-800">{t("xbloom.beansMonthly")}</h3>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t("xbloom.since")}</p>
        <MonthlyBar data={beanByMonth} color="#059669" lang={lang} unit={t("xbloom.unitPcs")} />
      </section>
    </div>
  );
}
