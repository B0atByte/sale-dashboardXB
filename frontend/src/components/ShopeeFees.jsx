import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import { gmvOf } from "../utils/data";
import { formatCurrency, formatShortDate } from "../utils/format";
import { IconX, IconEye, IconChevronLeft, IconChevronRight } from "./Icons";

const PAGE_SIZES = [10, 25, 50, 100, "all"];

/**
 * สรุปค่าธรรมเนียม/ต้นทุนของแพลตฟอร์มออนไลน์ (Shopee/Lazada/Line Shop/...) ที่มีคอลัมน์ค่าธรรมเนียม
 * - การ์ดสรุป: ค่าจัดส่ง · ค่าธรรมเนียม · ค่าคอมมิชชั่น · รายรับสุทธิ
 * - ตารางรายเคส: คลิกหัวคอลัมน์เพื่อเรียง (เริ่มมาก→น้อย) + เลือกจำนวนแถว + แบ่งหน้า + ปุ่มดูรายละเอียด
 */
export default function ShopeeFees({ records = [], title, subtitle, defaultSortKey = "net", defaultSortDir = "desc" }) {
  const { t, lang } = useLang();
  const [detail, setDetail] = useState(null);
  const [sortKey, setSortKey] = useState(defaultSortKey); // เริ่มที่รายรับสุทธิ (หน้าเครื่อง = วันที่ล่าสุด)
  const [sortDir, setSortDir] = useState(defaultSortDir); // มาก → น้อย
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const totals = useMemo(
    () =>
      records.reduce(
        (s, r) => ({
          gmv: s.gmv + gmvOf(r),
          shipping: s.shipping + (r.shipping || 0),
          fee: s.fee + (r.fee || 0),
          commission: s.commission + (r.commission || 0),
          net: s.net + (r.netRevenue || 0),
        }),
        { gmv: 0, shipping: 0, fee: 0, commission: 0, net: 0 }
      ),
    [records]
  );

  const cards = [
    { label: t("shopee.gmv"), value: formatCurrency(totals.gmv) },
    { label: t("shopee.shipping"), value: formatCurrency(totals.shipping) },
    { label: t("shopee.fees"), value: formatCurrency(totals.fee + totals.commission) },
    { label: t("shopee.net"), value: formatCurrency(totals.net), accent: true },
  ];

  // คอลัมน์ที่คลิกเรียงได้ (num = เรียงตามค่าตัวเลข)
  const COLS = [
    { key: "date", label: t("col.date"), get: (r) => r.date || "" },
    { key: "product", label: t("col.product"), get: (r) => r.productName || "" },
    { key: "gmv", label: t("shopee.gmv"), num: true, get: (r) => gmvOf(r) },
    { key: "shipping", label: t("shopee.shipping"), num: true, get: (r) => r.shipping || 0 },
    { key: "fee", label: t("shopee.fee"), num: true, get: (r) => r.fee || 0 },
    { key: "commission", label: t("shopee.commission"), num: true, get: (r) => r.commission || 0 },
    { key: "net", label: t("shopee.net"), num: true, get: (r) => r.netRevenue || 0 },
  ];

  const sorted = useMemo(() => {
    const col = COLS.find((c) => c.key === sortKey) || COLS[0];
    return [...records].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      const cmp = col.num ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = pageSize === "all" ? sorted : sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // เปลี่ยน sort / ขนาดหน้า → กลับหน้าแรก (ไม่รวม records เพื่อไม่ให้ auto-refresh เด้งหน้า)
  useEffect(() => {
    setPage(1);
  }, [sortKey, sortDir, pageSize]);
  // ถ้าข้อมูลลดลงจนหน้าปัจจุบันเกินหน้าสุดท้าย ให้หนีบกลับเข้าช่วง
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc"); // คลิกครั้งแรก = มาก→น้อย
    }
  };

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tighter text-slate-800">{title ?? t("shopee.title")}</h2>
        <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">{subtitle ?? t("shopee.sub")}</p>
      </div>

      {/* การ์ดสรุป */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl px-4 py-3 ${c.accent ? "bg-indigo-600 text-white" : "bg-slate-50"}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${c.accent ? "text-indigo-100" : "text-slate-400"}`}>
              {c.label}
            </p>
            <p className={`mt-1 text-lg font-bold tracking-tight ${c.accent ? "text-white" : "text-slate-800"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* แถบควบคุม: จำนวนแถว + ยอดรวมรายการ */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("shopee.rows")}</span>
          <select
            value={String(pageSize)}
            onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={String(s)}>
                {s === "all" ? t("shopee.all") : s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs font-bold text-slate-500">
          {total} {t("shopee.cases")}
        </span>
      </div>

      {/* ตารางรายเคส */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {COLS.map((c) => {
                const active = c.key === sortKey;
                return (
                  <th key={c.key} className={`px-3 py-2.5 ${c.num ? "text-right" : ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-widest transition hover:text-slate-600 ${active ? "text-indigo-600" : ""}`}
                    >
                      {c.label}
                      <span className="text-[9px] leading-none">{active ? (sortDir === "desc" ? "▼" : "▲") : "↕"}</span>
                    </button>
                  </th>
                );
              })}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={`${r.id || i}`} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-3 py-2.5 tabular-nums text-slate-500">{r.date ? formatShortDate(r.date, lang) : "—"}</td>
                <td className="px-3 py-2.5 font-bold text-slate-700">
                  <span className="line-clamp-1">{r.productName || t("common.na")}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">{formatCurrency(gmvOf(r))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(r.shipping || 0)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(r.fee || 0)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(r.commission || 0)}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-800">{formatCurrency(r.netRevenue || 0)}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => setDetail(r)}
                    title={t("shopee.detail")}
                    aria-label={t("shopee.detail")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 transition hover:bg-indigo-50 active:scale-95"
                  >
                    <IconEye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* แบ่งหน้า */}
      {pageSize !== "all" && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1 rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconChevronLeft className="h-4 w-4" /> {t("table.prev")}
          </button>
          <span className="text-xs font-bold text-slate-500">
            {t("table.page", { p: safePage, t: totalPages })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1 rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("table.next")} <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* modal รายละเอียดรายเคส */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-800">{t("shopee.caseTitle")}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {detail.date ? formatShortDate(detail.date, lang) : "—"} · {detail.orderNo || detail.productId || "—"}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{detail.productName || t("common.na")}</p>
            <div className="space-y-1.5 text-sm">
              {[
                { l: t("col.customer"), v: detail.customer || "—", plain: true },
                { l: t("col.qty"), v: `${detail.quantity || 0}`, plain: true },
                { l: t("shopee.gmv"), v: formatCurrency(gmvOf(detail)) },
                { l: t("shopee.shipping"), v: formatCurrency(detail.shipping || 0) },
                { l: t("shopee.fee"), v: formatCurrency(detail.fee || 0) },
                { l: t("shopee.commission"), v: formatCurrency(detail.commission || 0) },
              ].map((row) => (
                <div key={row.l} className="flex items-center justify-between border-b border-slate-50 py-1.5">
                  <span className="text-xs font-medium text-slate-500">{row.l}</span>
                  <span className={`tabular-nums ${row.plain ? "font-medium text-slate-700" : "font-bold text-slate-800"}`}>{row.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-500">{t("shopee.net")}</span>
                <span className="text-base font-bold tabular-nums text-indigo-700">{formatCurrency(detail.netRevenue || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
