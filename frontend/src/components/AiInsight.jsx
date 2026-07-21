import { useCallback, useEffect, useState } from "react";
import { useLang } from "../i18n";
import { IconSparkles, IconRefresh } from "./Icons";

/**
 * การ์ด "AI สรุปยอดขาย" — เรียก /api/insight ให้ AI วิเคราะห์ข้อมูลตามตัวกรองปัจจุบัน
 * backend cache ผลไว้ 10 นาที (ข้อมูลเดิม = ไม่เรียก AI ซ้ำ) เพื่อคุมค่าใช้จ่าย
 */
export default function AiInsight({ from, to, platform }) {
  const { t, lang } = useLang();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (platform) params.set("platform", platform);
      params.set("lang", lang);
      try {
        const res = await fetch(`/api/insight?${params.toString()}`, {
          credentials: "same-origin",
          signal,
        });
        if (!res.ok) throw new Error("insight failed");
        const d = await res.json();
        setText(d.insight || "");
        setLoading(false);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(true);
        setLoading(false);
      }
    },
    [from, to, platform, lang]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section className="rounded-[32px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <IconSparkles className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            {t("ai.insight.title")}
          </h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
            AI
          </span>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          title={t("ai.insight.refresh")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600 active:scale-95 disabled:opacity-50"
        >
          <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !text ? (
        <p className="text-sm font-medium text-slate-400">{t("ai.insight.loading")}</p>
      ) : error && !text ? (
        <p className="text-sm font-medium text-rose-500">{t("ai.insight.error")}</p>
      ) : (
        // ถ้ามีเนื้อหาเดิมอยู่แล้ว คงไว้เสมอ (ตอนโหลด/พลาดชั่วคราวจะได้ไม่ "หาย")
        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {text}
        </div>
      )}
    </section>
  );
}
