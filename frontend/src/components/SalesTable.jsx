import { useEffect, useMemo, useState } from "react";
import { useLang } from "../i18n";
import PlatformBadge from "./PlatformBadge";
import { formatCurrency, formatNumber, formatDate } from "../utils/format";
import { exportSalesCsv, gmvOf } from "../utils/data";
import {
  IconSearch,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from "./Icons";

const PAGE_SIZE = 20;

// คอลัมน์ที่คลิกหัวเพื่อเรียงได้ (num=ตัวเลขเทียบค่า, ไม่งั้นเรียงแบบข้อความ)
const COLUMNS = [
  { key: "date", labelKey: "col.date", get: (r) => r.date || "" },
  { key: "platform", labelKey: "col.platform", get: (r) => r.platform || "" },
  { key: "customer", labelKey: "col.customer", get: (r) => r.customer || "" },
  { key: "product", labelKey: "col.product", get: (r) => r.productName || "" },
  { key: "category", labelKey: "col.category", get: (r) => r.category || "" },
  { key: "campaign", labelKey: "col.campaign", get: (r) => r.campaign || "" },
  { key: "qty", labelKey: "col.qty", num: true, align: "right", get: (r) => r.quantity || 0 },
  { key: "amount", labelKey: "col.amount", num: true, align: "right", get: (r) => gmvOf(r) },
];

/**
 * ตารางรายการขาย: คลิกหัวคอลัมน์เพื่อเรียง (มาก↔น้อย) ได้ทุกคอลัมน์ + ค้นหา + แบ่งหน้า + ส่งออก CSV
 */
export default function SalesTable({ records = [], filtersKey = "" }) {
  const { t, lang } = useLang();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc"); // คลิกครั้งแรก = มากไปน้อย

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // เรียงตามคอลัมน์ที่เลือก (ตัวเลข=เทียบค่า, ข้อความ=localeCompare ตามภาษา)
  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey) || COLUMNS[0];
    const dir = sortDir === "asc" ? 1 : -1;
    const locale = lang === "en" ? "en" : "th";
    return [...records].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      const cmp = col.num
        ? (va || 0) - (vb || 0)
        : String(va).localeCompare(String(vb), locale, { numeric: true });
      return dir * cmp;
    });
  }, [records, sortKey, sortDir, lang]);

  // ค้นหาในตาราง (กรองเฉพาะแถวที่แสดง ไม่กระทบการเรียก API)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) =>
      `${r.productName} ${r.customer} ${r.category} ${r.campaign}`
        .toLowerCase()
        .includes(q)
    );
  }, [sorted, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // รีเซ็ตหน้าเมื่อเปลี่ยนตัวกรองหลัก (filtersKey) หรือพิมพ์ค้นหา
  useEffect(() => {
    setPage(1);
  }, [filtersKey, query, sortKey, sortDir]);

  // ถ้าจำนวนข้อมูลลดลงจนหน้าปัจจุบันเกินหน้าสุดท้าย ให้หนีบกลับเข้าช่วง
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const th =
    "px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400";

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
      {/* หัวการ์ด: ชื่อ + ค้นหา + ส่งออก */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter text-slate-800">
            {t("table.title")}
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {query
              ? t("table.foundCount", {
                  n: formatNumber(filtered.length),
                  total: formatNumber(sorted.length),
                })
              : t("table.allCount", { n: formatNumber(sorted.length) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("table.search")}
              className="w-52 rounded-xl border-none bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="button"
            onClick={() => exportSalesCsv(filtered, "xbloom-sales", t)}
            disabled={!filtered.length}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-900 active:scale-95 disabled:opacity-40"
          >
            <IconDownload className="h-4 w-4" /> {t("table.export")}
          </button>
        </div>
      </div>

      {/* ตารางเลื่อนแนวนอนได้บนจอเล็ก */}
      <div className="thin-scrollbar overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {COLUMNS.map((c) => {
                const active = c.key === sortKey;
                return (
                  <th key={c.key} className={`${th} ${c.align === "right" ? "text-right" : ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-widest transition hover:text-slate-600 ${active ? "text-indigo-600" : ""}`}
                    >
                      {t(c.labelKey)}
                      <span className="text-[9px] leading-none">
                        {active ? (sortDir === "desc" ? "▼" : "▲") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-slate-400"
                >
                  {t("table.noData")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                    {formatDate(r.date, lang)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <PlatformBadge platform={r.platform} />
                  </td>
                  <td
                    className="max-w-40 truncate px-4 py-3 text-slate-600"
                    title={r.customer}
                  >
                    {r.customer}
                  </td>
                  <td
                    className="max-w-56 truncate px-4 py-3 font-semibold text-slate-800"
                    title={r.productName}
                  >
                    {r.productName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {r.category}
                  </td>
                  <td
                    className="max-w-40 truncate px-4 py-3 text-slate-500"
                    title={r.campaign}
                  >
                    {r.campaign || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-600">
                    {formatNumber(r.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-800">
                    {formatCurrency(gmvOf(r))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* แถบแบ่งหน้า */}
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
          className="flex items-center gap-1 rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconChevronLeft className="h-4 w-4" /> {t("table.prev")}
        </button>
        <span className="text-xs font-bold text-slate-500">
          {t("table.page", {
            p: formatNumber(safePage),
            t: formatNumber(totalPages),
          })}
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
    </section>
  );
}
