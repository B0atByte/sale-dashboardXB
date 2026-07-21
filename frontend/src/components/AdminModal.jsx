import { useCallback, useEffect, useState } from "react";
import { useLang } from "../i18n";
import { useSettings } from "../settings";
import { IconX, IconSettings } from "./Icons";

/**
 * Admin Panel (เฉพาะ admin) — แบบแท็บ:
 *   ทั่วไป (แบรนด์/ความไว/แหล่งยอดขาย) · แหล่งข้อมูล · เป้ายอดขาย · ผู้ใช้
 */
export default function AdminModal({ open, onClose, onChanged }) {
  const { t, lang } = useLang();
  const { settings } = useSettings();
  const [tab, setTab] = useState("general");

  // ทั่วไป (settings)
  const [gen, setGen] = useState(settings);
  const [genStatus, setGenStatus] = useState(null);
  const [genBusy, setGenBusy] = useState(false);

  // แหล่งข้อมูล
  const [info, setInfo] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  // ผู้ใช้
  const [users, setUsers] = useState([]);
  const [nu, setNu] = useState({ username: "", pin: "", role: "viewer" });
  const [uStatus, setUStatus] = useState(null);
  const [uBusy, setUBusy] = useState(false);

  // เป้ายอดขาย
  const [tg, setTg] = useState({ month: "", amount: "" });
  const [tgStatus, setTgStatus] = useState(null);
  const [tgBusy, setTgBusy] = useState(false);

  const loadUsers = useCallback(() => {
    fetch("/api/admin/users", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab("general");
    setStatus(null);
    setUStatus(null);
    setTgStatus(null);
    setGenStatus(null);
    fetch("/api/admin/source", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        setUrl(d.url || "");
      })
      .catch(() => {});
    loadUsers();
  }, [open, loadUsers]);

  useEffect(() => {
    if (open) setGen(settings);
  }, [open, settings]);

  if (!open) return null;

  const saveSettings = async () => {
    setGenBusy(true);
    setGenStatus(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          brandTitle: gen.brandTitle,
          brandFooter: gen.brandFooter,
          showDemo: gen.showDemo,
          cacheTtlSeconds: Number(gen.cacheTtlSeconds),
          refreshIntervalMs: Number(gen.refreshIntervalMs),
          gmvField: gen.gmvField,
        }),
      });
      if (res.ok) {
        setGenStatus({ type: "success", msg: t("settings.saved") });
        onChanged?.();
      } else {
        setGenStatus({ type: "error", msg: t("admin.errFetch") });
      }
    } catch {
      setGenStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setGenBusy(false);
    }
  };

  const saveSource = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ url }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: "success", msg: t("admin.success") });
        setInfo(d);
        onChanged?.();
      } else {
        setStatus({ type: "error", msg: d.error === "invalid_url" ? t("admin.errUrl") : t("admin.errFetch") });
      }
    } catch {
      setStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setBusy(false);
    }
  };

  const saveTarget = async () => {
    setTgBusy(true);
    setTgStatus(null);
    try {
      const res = await fetch("/api/admin/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ month: tg.month, amount: Number(tg.amount) }),
      });
      if (res.ok) {
        setTgStatus({ type: "success", msg: t("admin.targetSaved") });
        onChanged?.();
      } else {
        setTgStatus({ type: "error", msg: t("admin.errFetch") });
      }
    } catch {
      setTgStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setTgBusy(false);
    }
  };

  const addUser = async () => {
    setUBusy(true);
    setUStatus(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(nu),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setUStatus({ type: "success", msg: t("admin.userAdded") });
        setNu({ username: "", pin: "", role: "viewer" });
        setUsers(d.users || []);
      } else {
        const m =
          d.error === "duplicate" ? t("admin.errDup")
          : d.error === "invalid_pin" ? t("admin.errPinFmt")
          : d.error === "invalid_username" ? t("admin.errUserFmt")
          : t("admin.errFetch");
        setUStatus({ type: "error", msg: m });
      }
    } catch {
      setUStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setUBusy(false);
    }
  };

  const delUser = async (username) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`${t("admin.confirmDelete")} ${username}`)) return;
    const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setUsers(d.users || []);
    else setUStatus({ type: "error", msg: d.error === "last_admin" ? t("admin.errLastAdmin") : t("admin.errFetch") });
  };

  const field = "rounded-xl border-none bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100";
  const label = "mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400";
  const heading = "mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400";
  const saveBtn = "rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-900 active:scale-95 disabled:opacity-40";
  const canAddUser = nu.username.trim().length >= 2 && nu.pin.length >= 4 && !uBusy;

  const TABS = [
    { k: "general", label: t("settings.tabGeneral") },
    { k: "source", label: t("settings.tabSource") },
    { k: "targets", label: t("settings.tabTargets") },
    { k: "users", label: t("settings.tabUsers") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="thin-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white">
              <IconSettings className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">{t("admin.title")}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* แท็บ */}
        <div className="thin-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
          {TABS.map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => setTab(x.k)}
              className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition ${
                tab === x.k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        {/* ===== ทั่วไป ===== */}
        {tab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className={heading}>{t("settings.brand")}</h3>
              <label className={label}>{t("settings.title")}</label>
              <input value={gen.brandTitle} onChange={(e) => setGen((s) => ({ ...s, brandTitle: e.target.value }))} className={`${field} w-full`} />
              <label className={`${label} mt-3`}>{t("settings.footerText")}</label>
              <input value={gen.brandFooter} onChange={(e) => setGen((s) => ({ ...s, brandFooter: e.target.value }))} className={`${field} w-full`} />
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={gen.showDemo} onChange={(e) => setGen((s) => ({ ...s, showDemo: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                {t("settings.demo")}
              </label>
            </div>

            <div>
              <h3 className={heading}>{t("settings.perf")}</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={label}>{t("settings.cache")}</label>
                  <input type="number" min="5" value={gen.cacheTtlSeconds} onChange={(e) => setGen((s) => ({ ...s, cacheTtlSeconds: e.target.value }))} className={`${field} w-full`} />
                </div>
                <div className="flex-1">
                  <label className={label}>{t("settings.refresh")}</label>
                  <input type="number" min="5" value={Math.round((gen.refreshIntervalMs || 0) / 1000)} onChange={(e) => setGen((s) => ({ ...s, refreshIntervalMs: Number(e.target.value) * 1000 }))} className={`${field} w-full`} />
                </div>
              </div>
            </div>

            <div>
              <h3 className={heading}>{t("settings.gmv")}</h3>
              <div className="flex gap-2">
                {[{ v: "lineTotal", l: t("settings.gmvLine") }, { v: "netRevenue", l: t("settings.gmvNet") }].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setGen((s) => ({ ...s, gmvField: o.v }))}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                      gen.gmvField === o.v ? "bg-slate-800 text-white shadow" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {genStatus && (
              <p className={`text-xs font-bold ${genStatus.type === "success" ? "text-emerald-600" : "text-rose-500"}`}>{genStatus.msg}</p>
            )}
            <div className="flex justify-end">
              <button onClick={saveSettings} disabled={genBusy} className={saveBtn}>
                {genBusy ? t("admin.saving") : t("admin.save")}
              </button>
            </div>
          </div>
        )}

        {/* ===== แหล่งข้อมูล ===== */}
        {tab === "source" && (
          <div>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">{t("admin.desc")}</p>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t("admin.current")}
              {info && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] normal-case text-slate-500">
                  {info.isCustom ? t("admin.custom") : t("admin.fromEnv")}
                </span>
              )}
            </div>
            <textarea value={url} onChange={(e) => setUrl(e.target.value)} rows={3} placeholder={t("admin.placeholder")} className="w-full resize-none break-all rounded-2xl bg-slate-50 p-4 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" />
            {status && (
              <p className={`mt-2 text-xs font-bold ${status.type === "success" ? "text-emerald-600" : "text-rose-500"}`}>{status.msg}</p>
            )}
            <div className="mt-3 flex justify-end">
              <button onClick={saveSource} disabled={busy || !url.trim()} className={saveBtn}>
                {busy ? t("admin.saving") : t("admin.save")}
              </button>
            </div>
          </div>
        )}

        {/* ===== เป้ายอดขาย ===== */}
        {tab === "targets" && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="month" value={tg.month} onChange={(e) => setTg((s) => ({ ...s, month: e.target.value }))} className={field} />
              <input type="number" min="0" step="10000" value={tg.amount} onChange={(e) => setTg((s) => ({ ...s, amount: e.target.value }))} placeholder={t("admin.targetAmount")} className={`${field} min-w-32 flex-1`} />
              <button onClick={saveTarget} disabled={tgBusy || !tg.month || !tg.amount} className={saveBtn}>
                {t("admin.save")}
              </button>
            </div>
            {tgStatus && (
              <p className={`mt-2 text-xs font-bold ${tgStatus.type === "success" ? "text-emerald-600" : "text-rose-500"}`}>{tgStatus.msg}</p>
            )}
          </div>
        )}

        {/* ===== ผู้ใช้ ===== */}
        {tab === "users" && (
          <div>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.username} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-black uppercase text-white">{u.username.slice(0, 1)}</span>
                    <div className="leading-tight">
                      <p className="text-xs font-bold text-slate-700">{u.username}</p>
                      <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">{t(`role.${u.role}`)}</p>
                    </div>
                  </div>
                  <button onClick={() => delUser(u.username)} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50">
                    {lang === "en" ? "Delete" : "ลบ"}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-3">
              <input value={nu.username} onChange={(e) => setNu((s) => ({ ...s, username: e.target.value }))} placeholder={t("login.username")} className={`${field} min-w-28 flex-1`} />
              <input value={nu.pin} onChange={(e) => setNu((s) => ({ ...s, pin: e.target.value.replace(/\D/g, "").slice(0, 12) }))} type="password" inputMode="numeric" placeholder={t("admin.userPin")} className={`${field} w-28`} />
              <select value={nu.role} onChange={(e) => setNu((s) => ({ ...s, role: e.target.value }))} className={`${field} cursor-pointer`}>
                <option value="viewer">{t("role.viewer")}</option>
                <option value="admin">{t("role.admin")}</option>
              </select>
              <button onClick={addUser} disabled={!canAddUser} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40">
                {t("admin.addUser")}
              </button>
            </div>
            {uStatus && (
              <p className={`mt-2 text-xs font-bold ${uStatus.type === "success" ? "text-emerald-600" : "text-rose-500"}`}>{uStatus.msg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
