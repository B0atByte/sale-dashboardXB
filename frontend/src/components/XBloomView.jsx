import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import ShopeeFees from "./ShopeeFees";
import { isMachine } from "../utils/data";
import { formatNumber } from "../utils/format";
import { IconRefresh, IconGrid } from "./Icons";

// หน้านี้ล็อกไว้ที่ "เดือน ก.ค. 2026" เท่านั้น (ไม่แสดงเดือนอื่น)
const MONTH = "2026-07";

/**
 * หน้า "xBloom View" — เหลือเฉพาะการ์ด "ค่าธรรมเนียม & รายรับสุทธิ" ของการขายเครื่อง
 * เดือน ก.ค. 2026 (พร้อมตารางรายการซื้อล่าสุด + ดูรายละเอียดรายเคส)
 */
export default function XBloomView() {
  const { t } = useLang();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = (force = false) => {
    setLoading(true);
    setError(false);
    fetch(`/api/sales${force ? "?fresh=1" : ""}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => setRecords((d.records ?? []).filter((r) => String(r.date || "").startsWith(MONTH))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const machines = useMemo(() => records.filter(isMachine), [records]);
  const machineUnits = useMemo(() => machines.reduce((s, r) => s + (r.quantity || 0), 0), [machines]);

  const card = "rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm";

  if (loading && !records.length) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
        <div className="h-96 animate-pulse rounded-[32px] border border-slate-100 bg-slate-100" />
      </div>
    );
  }
  if (error) {
    return <div className={`${card} py-16 text-center text-sm font-bold text-slate-400`}>{t("error.load")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* หัวเรื่อง + ปุ่มรีเฟรช (เฉพาะ ก.ค. 2026) */}
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
        <div className="mt-5">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("xbloom.machines")}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-800">
              {formatNumber(machineUnits)} {t("xbloom.unitMachine")}
            </p>
          </div>
        </div>
      </section>

      {/* ค่าธรรมเนียม & รายรับสุทธิ + ตารางรายการซื้อเครื่องล่าสุด (คลิกดูรายละเอียด) */}
      <ShopeeFees
        records={machines}
        title={t("xbloom.feesTitle")}
        subtitle={t("xbloom.feesSub")}
        defaultSortKey="date"
        defaultSortDir="desc"
      />
    </div>
  );
}
