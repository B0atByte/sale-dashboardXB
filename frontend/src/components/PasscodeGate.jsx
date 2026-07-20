import { useState } from "react";
import { useLang } from "../i18n";
import DemoBadge from "./DemoBadge";

/**
 * หน้าเข้าสู่ระบบ — username + PIN
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
    "w-full rounded-2xl border-2 border-transparent bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[32px] border border-slate-100 bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <img src="/xbloom-logo.png" alt="xBloom" className="h-16 w-16 rounded-3xl shadow-lg shadow-slate-200" />
          <div className="mt-4 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tighter text-slate-800">xBloom Sale Dashboard</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
            {t("gate.subtitle")}
          </p>
        </div>

        <div className="mt-7 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            placeholder={t("login.username")}
            aria-label={t("login.username")}
            className={fieldClass}
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t("login.pin")}
            aria-label={t("login.pin")}
            className={`${fieldClass} tracking-[0.3em] ${status ? "ring-2 ring-rose-100" : ""}`}
          />
        </div>

        {status === "wrong" && (
          <p className="mt-3 text-center text-xs font-bold text-rose-500">{t("gate.wrong")}</p>
        )}
        {status === "locked" && (
          <p className="mt-3 text-center text-xs font-bold text-rose-500">{t("gate.locked")}</p>
        )}

        <button
          type="submit"
          disabled={!username.trim() || pin.length < 4 || busy}
          className="mt-6 w-full rounded-2xl bg-slate-800 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-200 transition hover:bg-slate-900 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? t("gate.checking") : t("gate.submit")}
        </button>

        <div className="mt-6 flex justify-center gap-1">
          {["th", "en"].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider transition ${
                lang === l ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
