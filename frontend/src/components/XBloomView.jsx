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
import SalesTable from "./SalesTable";
import ToggleGroup from "./ToggleGroup";
import {
  isMachine,
  machineColorDonut,
  platformDonutFrom,
  aggregateTrend,
} from "../utils/data";
import { formatNumber } from "../utils/format";
import { IconRefresh, IconGrid } from "./Icons";

// เริ่มนับตั้งแต่ ก.ค. 2026 (ตามโจทย์)
const START = "2026-07-01";
const BEAN_TEA = ["beans", "xpod", "tea", "sachet"];
const isBeanTea = (r) => BEAN_TEA.includes(String(r.category || "").trim().toLowerCase());

const fieldCls =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white";

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
 * - ฟิลเตอร์ช่วงเวลา (วัน/เดือน/ปี + เลือกช่วงเจาะจง) + ช่องทาง — คุมทั้งหน้า
 * - KPI + จำนวนเครื่องที่ขายรายเดือน
 * - โดนัทสัดส่วนเครื่องตามสี / ตามช่องทาง (เริ่มที่ "จำนวนเครื่อง" สลับดู ยอดขาย ฿ ได้)
 * - การ์ดค่าธรรมเนียม & รายรับสุทธิ + ตารางรายการซื้อเครื่องล่าสุด (คลิกดูรายละเอียด)
 * - จำนวนเมล็ดที่ขายทุกประเภทรายเดือน
 */
export default function XBloomView() {
  const { t, lang } = useLang();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [gran, setGran] = useState("year"); // year | month | day
  const [anchor, setAnchor] = useState(""); // วันอ้างอิงที่เลือก (YYYY-MM-DD)
  const [channel, setChannel] = useState(""); // "" = ทุกช่องทาง

  const load = (force = false) => {
    setLoading(true);
    setError(false);
    fetch(`/api/sales${force ? "?fresh=1" : ""}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        const recs = (d.records ?? []).filter((r) => String(r.date || "") >= START);
        setRecords(recs);
        const dates = recs.filter(isMachine).map((r) => r.date).filter(Boolean);
        if (dates.length) {
          const max = dates.reduce((a, b) => (a > b ? a : b));
          setAnchor((prev) => prev || max); // ตั้งต้นที่วันล่าสุด (ครั้งแรกเท่านั้น)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ตัวเลือกช่องทาง + ปี (จากเครื่องทั้งหมด ยังไม่กรอง)
  const allMachines = useMemo(() => records.filter(isMachine), [records]);
  const channels = useMemo(() => {
    const set = new Set();
    for (const r of allMachines) {
      const p = String(r.platform || "").trim();
      if (p) set.add(p);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allMachines]);
  const machineDates = useMemo(() => allMachines.map((r) => r.date).filter(Boolean), [allMachines]);
  const dataMin = machineDates.length ? machineDates.reduce((a, b) => (a < b ? a : b)) : "";
  const dataMax = machineDates.length ? machineDates.reduce((a, b) => (a > b ? a : b)) : "";
  const years = useMemo(() => {
    const set = new Set(machineDates.map((d) => d.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [machineDates]);

  // กรองตามช่วงเวลา + ช่องทาง (คุมทั้งหน้า)
  const scopeKey =
    gran === "year" ? anchor.slice(0, 4) : gran === "month" ? anchor.slice(0, 7) : anchor;
  const base = useMemo(
    () =>
      records.filter(
        (r) =>
          (!channel || String(r.platform || "").trim() === channel) &&
          String(r.date || "").startsWith(scopeKey)
      ),
    [records, channel, scopeKey]
  );
  const machines = useMemo(() => base.filter(isMachine), [base]);
  const beans = useMemo(() => base.filter(isBeanTea), [base]);

  const machineUnits = useMemo(() => machines.reduce((s, r) => s + (r.quantity || 0), 0), [machines]);
  const beanUnits = useMemo(() => beans.reduce((s, r) => s + (r.quantity || 0), 0), [beans]);

  const machineByMonth = useMemo(() => aggregateTrend(machines, "month", "units"), [machines]);
  const beanByMonth = useMemo(() => aggregateTrend(beans, "month", "units"), [beans]);

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
      {/* หัวเรื่อง + ตัวกรอง + KPI */}
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

        {/* ตัวกรอง: ช่วงเวลา (toggle + เลือกวัน/เดือน/ปีเจาะจง) + ช่องทาง */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ToggleGroup
            value={gran}
            onChange={setGran}
            options={[
              { v: "year", label: t("trend.year") },
              { v: "month", label: t("trend.month") },
              { v: "day", label: t("trend.day") },
            ]}
          />

          {gran === "day" ? (
            <input
              type="date"
              value={anchor}
              min={dataMin || undefined}
              max={dataMax || undefined}
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
              aria-label={t("report.pickDate")}
              className={fieldCls}
            />
          ) : gran === "month" ? (
            <input
              type="month"
              value={anchor.slice(0, 7)}
              min={dataMin ? dataMin.slice(0, 7) : undefined}
              max={dataMax ? dataMax.slice(0, 7) : undefined}
              onChange={(e) => e.target.value && setAnchor(`${e.target.value}-${anchor.slice(8) || "01"}`)}
              aria-label={t("report.pickMonth")}
              className={fieldCls}
            />
          ) : (
            <select
              value={anchor.slice(0, 4)}
              onChange={(e) => setAnchor(`${e.target.value}-${anchor.slice(5) || "01-01"}`)}
              aria-label={t("report.pickYear")}
              className={fieldCls}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* ช่องทาง / แพลตฟอร์ม */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("report.channel")}</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={fieldCls}>
              <option value="">{t("report.allChannels")}</option>
              {channels.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
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

      {/* โดนัท 2 คอลัมน์: สัดส่วนเครื่องตามสี + ตามช่องทาง (เริ่มที่ "จำนวนเครื่อง" สลับ ฿ ได้) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DonutChart
          title={t("xbloom.byColor")}
          subtitle={t("xbloom.byColorSub")}
          records={machines}
          build={machineColorDonut}
          defaultMetric="units"
          unitLabel={t("xbloom.unitMachine")}
          showGranToggle={false}
        />
        <DonutChart
          title={t("xbloom.byChannel")}
          subtitle={t("xbloom.byChannelSub")}
          records={machines}
          build={platformDonutFrom}
          defaultMetric="units"
          unitLabel={t("xbloom.unitMachine")}
          showGranToggle={false}
        />
      </div>

      {/* แนวโน้มรายเดือน: เครื่อง + เมล็ด วางข้างกันให้เทียบง่าย */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={card}>
          <h3 className="mb-1 text-lg font-bold tracking-tight text-slate-800">{t("xbloom.machinesMonthly")}</h3>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t("xbloom.since")}</p>
          <MonthlyBar data={machineByMonth} color="#4f46e5" lang={lang} unit={t("xbloom.unitMachine")} />
        </section>
        <section className={card}>
          <h3 className="mb-1 text-lg font-bold tracking-tight text-slate-800">{t("xbloom.beansMonthly")}</h3>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{t("xbloom.since")}</p>
          <MonthlyBar data={beanByMonth} color="#059669" lang={lang} unit={t("xbloom.unitPcs")} />
        </section>
      </div>

      {/* รายการขายเครื่อง (ล่างสุด) — ค้นหา/เรียง/แบ่งหน้า/ส่งออก CSV ได้ */}
      <SalesTable
        records={machines}
        filtersKey={`${gran}|${anchor}|${channel}`}
        hideColumns={["campaign"]}
      />
    </div>
  );
}
