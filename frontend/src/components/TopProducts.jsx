import { useLang } from "../i18n";
import { formatCurrency, formatNumber } from "../utils/format";

/**
 * สินค้าขายดี Top 5 — แถวสไตล์เดียวกับ legend + แถบสัดส่วนตาม GMV
 */
export default function TopProducts({ products = [] }) {
  const { t } = useLang();
  const maxGmv = Math.max(...products.map((p) => p.gmv), 1);

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tighter text-slate-800">
          {t("top.title")}
        </h2>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t("top.sub")}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          {t("top.noData")}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {products.map((p, i) => (
            <li
              key={`${p.name}-${i}`}
              className="rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-white hover:shadow-sm"
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-xs font-black text-indigo-600">
                    {i + 1}
                  </span>
                  <span
                    className="truncate text-[11px] font-bold text-slate-700"
                    title={p.name}
                  >
                    {p.name}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[11px] font-bold text-slate-800">
                    {formatCurrency(p.gmv)}
                  </span>
                  <span className="ml-2 text-[10px] font-bold text-slate-400">
                    {formatNumber(p.units)} {t("top.units")}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${(p.gmv / maxGmv) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
