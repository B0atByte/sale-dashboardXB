import { useLang } from "../i18n";

/**
 * แบนเนอร์แจ้งข้อผิดพลาดพร้อมปุ่มลองใหม่
 */
export default function ErrorBanner({ onRetry }) {
  const { t } = useLang();
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-rose-100 bg-rose-50 px-6 py-5"
    >
      <div className="flex items-center gap-3">
        <svg
          className="h-6 w-6 shrink-0 text-rose-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm font-bold text-rose-700">{t("error.load")}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-rose-700 active:scale-95"
      >
        {t("error.retry")}
      </button>
    </div>
  );
}
