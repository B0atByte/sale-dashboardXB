import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n";
import { IconSparkles, IconSend, IconX } from "./Icons";

/**
 * แชต AI ถาม-ตอบเรื่องยอดขาย — ปุ่มลอยมุมขวาล่าง เปิดแล้วเป็นหน้าต่างแชต
 * ยิง POST /api/chat (backend ใช้ข้อมูลยอดขายทั้งหมดเป็น context)
 */
export default function AiChat() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "ai", text }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const send = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ question: q, lang }),
      });
      const d = await res.json().catch(() => ({}));
      setMessages((m) => [
        ...m,
        { role: "ai", text: res.ok ? d.answer || "" : t("ai.chat.error") },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: t("ai.chat.error") }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-300/50 transition hover:bg-indigo-700 active:scale-95"
      >
        <IconSparkles className="h-5 w-5" /> {t("ai.chat.open")}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[520px] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
      {/* หัวหน้าต่าง */}
      <div className="flex items-center justify-between bg-indigo-600 px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <IconSparkles className="h-5 w-5" />
          <span className="font-bold">{t("ai.chat.title")}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 transition hover:bg-white/20"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>

      {/* ข้อความ */}
      <div
        ref={scrollRef}
        className="thin-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
      >
        {messages.length === 0 && (
          <p className="mt-8 px-4 text-center text-xs font-medium text-slate-400">
            {t("ai.chat.empty")}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-100 bg-white text-slate-700"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-400">
              {t("ai.chat.thinking")}
            </div>
          </div>
        )}
      </div>

      {/* ช่องพิมพ์ */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("ai.chat.placeholder")}
          className="flex-1 rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
        >
          <IconSend className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
