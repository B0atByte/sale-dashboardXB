import { useLang } from "../i18n";

/**
 * การ์ดเป้ายอดขาย — ยอดขายจริงเทียบเป้าประจำเดือน + แถบความคืบหน้า %
 * (รูปแบบเดียวกับ TargetAchievementCard ของ k.boat)
 */
export default function TargetCard({ actualGmv = 0, targetGmv = 0, month = "" }) {
  const { t, lang } = useLang();
  const target = targetGmv || 0;
  const actual = actualGmv || 0;
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

  let monthLabel = "";
  if (month) {
    const d = new Date(`${month}-01T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      monthLabel = d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", {
        month: "short",
        year: "numeric",
      });
    }
  }

  return (
    <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tighter text-slate-800">{t("target.title")}</h2>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("target.sub")}</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {t("target.monthly")}
          {monthLabel && (
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-bold normal-case text-indigo-600">
              {monthLabel}
            </span>
          )}
        </h3>

        <div className="mb-4 flex items-end gap-2">
          <span className="text-3xl font-bold text-slate-800">฿{(actual / 1_000_000).toFixed(2)}M</span>
          <span className="mb-1.5 text-xs font-medium text-slate-400">
            / ฿{(target / 1_000_000).toFixed(1)}M
          </span>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-500">{t("target.achieved")}</span>
          <span className="text-indigo-600">{pct}%</span>
        </div>

        {target === 0 && (
          <p className="mt-3 text-[11px] font-medium text-slate-400">{t("target.notset")}</p>
        )}
      </div>
    </section>
  );
}
