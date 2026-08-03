import { useState } from "react";
import { useLang } from "../i18n";

/**
 * หน้าเข้าสู่ระบบ — username + PIN
 * ดีไซน์แนว blocks.so (shadcn): การ์ดฟอร์มอยู่กลางจอ พื้นหลังนวล
 * onLogin(username, pin) -> { ok } | { ok:false, locked }
 */
export default function PasscodeGate({ onLogin }) {
  const { t, lang, setLang } = useLang();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState(null); // "wrong" | "locked"
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || pin.length < 4 || busy) return;
    setBusy(true);
    setStatus(null);
    const r = await onLogin(username.trim(), pin);
    setBusy(false);
    if (!r.ok) {
      setStatus(r.locked ? "locked" : "wrong");
      setPin("");
    }
  };

  const fieldClass =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* โลโก้ + ชื่อแบรนด์ (กลาง) */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/xbloom-logo.png"
            alt="xBloom"
            className="h-14 w-14 rounded-2xl shadow-sm"
          />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            {t("gate.welcome")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{t("gate.formHint")}</p>
        </div>

        {/* การ์ดฟอร์ม */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {t("login.username")}
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder={t("login.username")}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="pin" className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("login.pin")}
              </label>
              <input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••"
                className={`${fieldClass} tracking-[0.3em] ${
                  status ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : ""
                }`}
              />
            </div>

            {status === "wrong" && (
              <p className="text-sm font-medium text-rose-600">{t("gate.wrong")}</p>
            )}
            {status === "locked" && (
              <p className="text-sm font-medium text-rose-600">{t("gate.locked")}</p>
            )}

            <button
              type="submit"
              disabled={!username.trim() || pin.length < 4 || busy}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? t("gate.checking") : t("gate.submit")}
            </button>
          </form>
        </div>

        {/* สลับภาษา */}
        <div className="mt-6 flex items-center justify-center gap-1">
          {["th", "en"].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition ${
                lang === l
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
