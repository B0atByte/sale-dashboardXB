import { useCallback, useEffect, useState } from "react";
import { useLang } from "../i18n";
import { useSettings } from "../settings";
import { IconX, IconSettings, IconDocument, IconCoffee } from "./Icons";

/**
 * เอกสารแหล่งข้อมูล (หน้า Document) — อธิบายว่าแดชบอร์ดอ่านคอลัมน์ไหนของชีตไหน (ตัวอักษรคอลัมน์จริง)
 * โดย "ไม่แสดงลิงก์ Google Sheets" (ตามข้อกำหนดความปลอดภัย)
 * ระบบจับคอลัมน์จาก "ชื่อหัวคอลัมน์" ไม่ใช่ตำแหน่งตายตัว — ตัวอักษร (C/AM/BF...) คือตำแหน่ง ณ ปัจจุบัน
 */
const DATA_DOCS = [
  {
    sheet: "xBloom Sales Update",
    tab: "Sales",
    columns: [
      { col: "C", header: "วันที่", use: "วันที่ (สำรอง)" },
      { col: "D", header: "แพลตฟอร์มขาย", use: "ช่องทาง" },
      { col: "E", header: "ชื่อลูกค้า", use: "ลูกค้า" },
      { col: "F", header: "หมายเลขคำสั่งซื้อ / INV", use: "เลขออเดอร์" },
      { col: "G", header: "เลขที่ใบเสร็จ (VTEC)", use: "เลขออเดอร์ (สำรอง)" },
      { col: "L", header: "สินค้า", use: "ชื่อสินค้า (สำรอง)" },
      { col: "M", header: "รหัสสินค้า (S/N) (CODE)", use: "รหัสสินค้า (สำรอง)" },
      { col: "O", header: "จำนวน", use: "จำนวนชิ้น" },
      { col: "P", header: "ราคาสินค้าขาย", use: "ยอดขาย (lineTotal)" },
      { col: "Q", header: "ค่าจัดส่งชำระโดย xBloom", use: "ค่าจัดส่ง (หน้าออนไลน์)" },
      { col: "W · Y · Z · AA–AD", header: "ค่าธรรมเนียมต่าง ๆ", use: "ค่าธรรมเนียมรวม (หน้าออนไลน์)" },
      { col: "X", header: "ค่าคอมมิชชั่น", use: "ค่าคอมมิชชั่น (หน้าออนไลน์)" },
      { col: "AK", header: "รายรับจากคำสั่งซื้อ", use: "รายรับสุทธิ" },
      { col: "AM", header: "ราคาคีย์ VTEC", use: "ยอดขาย — ค่าที่ใช้จริง", active: true },
      { col: "BA–BC", header: "Day · Month · Year", use: "สร้างวันที่ (หลัก)" },
      { col: "BD", header: "Product ID", use: "รหัสสินค้า (หลัก)" },
      { col: "BE", header: "Product Name", use: "ชื่อสินค้า (หลัก)" },
      { col: "BF", header: "Categroy", use: "หมวดสินค้า (dynamic — รวม Tea)" },
      { col: "BG", header: "Campaign", use: "แคมเปญ" },
    ],
  },
  {
    sheet: "Central World Branch",
    tab: "Store/Togo",
    columns: [
      { col: "B", header: "วันที่", use: "วันที่ (สำรอง)" },
      { col: "C", header: "แพลตฟอร์มขาย", use: "ช่องทาง" },
      { col: "D", header: "ชื่อลูกค้า", use: "ลูกค้า" },
      { col: "E", header: "หมายเลขคำสั่งซื้อ / INV", use: "เลขออเดอร์" },
      { col: "F", header: "เลขที่ใบเสร็จ (VTEC)", use: "เลขออเดอร์ (สำรอง)" },
      { col: "K", header: "สินค้า", use: "ชื่อสินค้า (สำรอง)" },
      { col: "N", header: "จำนวน", use: "จำนวนชิ้น" },
      { col: "O", header: "ราคาสินค้าขาย", use: "ยอดขาย (lineTotal)" },
      { col: "AE", header: "รายรับจากคำสั่งซื้อ", use: "รายรับสุทธิ" },
      { col: "AG", header: "ราคาคีย์ VTEC", use: "ยอดขาย — ค่าที่ใช้จริง", active: true },
      { col: "AK–AM", header: "Day · Month · Year", use: "สร้างวันที่ (หลัก)" },
      { col: "AN", header: "Product Name", use: "ชื่อสินค้า (หลัก)" },
      { col: "AO", header: "Category", use: "หมวดสินค้า" },
    ],
  },
];

/**
 * Admin Panel (เฉพาะ admin) — แบบแท็บ:
 *   ทั่วไป (แบรนด์/ความไว/แหล่งยอดขาย) · แหล่งข้อมูล · เป้ายอดขาย · ผู้ใช้
 */
export default function AdminModal({ open, user, platforms = [], onClose, onChanged }) {
  const { t, lang } = useLang();
  const { settings } = useSettings();
  const isIt = user?.role === "itsupport";
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
  const [extras, setExtras] = useState([]); // ชีตเสริม [{ url, platform }]
  const [extraBusy, setExtraBusy] = useState(false);
  const [extraStatus, setExtraStatus] = useState(null);

  // ผู้ใช้
  const [users, setUsers] = useState([]);
  const [nu, setNu] = useState({ username: "", pin: "", role: "viewer" });
  const [uStatus, setUStatus] = useState(null);
  const [uBusy, setUBusy] = useState(false);
  // แก้สิทธิ์ (access) รายคน
  const [accessFor, setAccessFor] = useState(null); // username ที่กำลังแก้
  const [accessDraft, setAccessDraft] = useState(null); // { mode:"all"|"allow"|"deny", platforms:[], overview:bool }
  const [accessBusy, setAccessBusy] = useState(false);
  // รีเซ็ต PIN รายคน (กรณีลืมรหัส)
  const [pinFor, setPinFor] = useState(null);
  const [pinDraft, setPinDraft] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

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
    setExtraStatus(null);
    if (user?.role === "itsupport") {
      fetch("/api/admin/source", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((d) => {
          setInfo(d);
          setUrl(d.url || "");
        })
        .catch(() => {});
      fetch("/api/admin/sources", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((d) => setExtras(Array.isArray(d.sources) ? d.sources : []))
        .catch(() => {});
    }
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

  const addExtraRow = () => setExtras((a) => [...a, { url: "", platform: "" }]);
  const updateExtra = (i, patch) =>
    setExtras((a) => a.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const removeExtra = (i) => setExtras((a) => a.filter((_, k) => k !== i));

  const saveExtras = async () => {
    setExtraBusy(true);
    setExtraStatus(null);
    try {
      const list = extras
        .filter((s) => String(s.url || "").trim())
        .map((s) => ({ url: s.url.trim(), platform: String(s.platform || "").trim() }));
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sources: list }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setExtras(d.sources || []);
        setExtraStatus({ type: "success", msg: t("admin.sourcesSaved") });
        onChanged?.();
      } else {
        setExtraStatus({ type: "error", msg: t("admin.errFetch") });
      }
    } catch {
      setExtraStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setExtraBusy(false);
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

  // ---------- แก้สิทธิ์เข้าถึงข้อมูลรายคน ----------
  const accessSummary = (a) => {
    if (!a) return t("access.all");
    if (a.allow?.length) return `${t("access.only")}: ${a.allow.join(", ")}`;
    if (a.deny?.length) return `${t("access.except")}: ${a.deny.join(", ")}`;
    return a.overview === false ? t("access.noOverview") : t("access.all");
  };
  const openAccess = (u) => {
    const a = u.access;
    let mode = "all";
    let plats = [];
    let overview = true;
    if (a) {
      overview = a.overview !== false;
      if (a.allow?.length) { mode = "allow"; plats = a.allow; }
      else if (a.deny?.length) { mode = "deny"; plats = a.deny; }
    }
    setAccessDraft({ mode, platforms: plats, overview });
    setPinFor(null);
    setAccessFor(accessFor === u.username ? null : u.username);
  };
  const openPin = (u) => {
    setAccessFor(null);
    setPinDraft("");
    setPinFor(pinFor === u.username ? null : u.username);
  };
  const saveResetPin = async () => {
    if (pinDraft.length < 4) return;
    setPinBusy(true);
    setUStatus(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(pinFor)}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin: pinDraft }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setPinFor(null);
        setPinDraft("");
        setUStatus({ type: "success", msg: t("admin.pinReset") });
      } else {
        setUStatus({ type: "error", msg: d.error === "invalid_pin" ? t("admin.errPinFmt") : t("admin.errFetch") });
      }
    } catch {
      setUStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setPinBusy(false);
    }
  };
  const togglePlat = (p) =>
    setAccessDraft((d) => ({
      ...d,
      platforms: d.platforms.includes(p) ? d.platforms.filter((x) => x !== p) : [...d.platforms, p],
    }));
  const saveAccess = async () => {
    if (!accessDraft) return;
    setAccessBusy(true);
    setUStatus(null);
    const d = accessDraft;
    let access;
    if (d.mode === "allow") access = { overview: d.overview, allow: d.platforms };
    else if (d.mode === "deny") access = { overview: d.overview, deny: d.platforms };
    else access = { overview: d.overview };
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(accessFor)}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ access }),
      });
      const dd = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers(dd.users || []);
        setAccessFor(null);
        setUStatus({ type: "success", msg: t("access.saved") });
      } else {
        setUStatus({ type: "error", msg: t("admin.errFetch") });
      }
    } catch {
      setUStatus({ type: "error", msg: t("admin.errFetch") });
    } finally {
      setAccessBusy(false);
    }
  };

  const field = "rounded-xl border-none bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100";
  const label = "mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400";
  const heading = "mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400";
  const saveBtn = "rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-900 active:scale-95 disabled:opacity-40";
  const canAddUser = nu.username.trim().length >= 2 && nu.pin.length >= 4 && !uBusy;

  const TABS = [
    { k: "general", label: t("settings.tabGeneral") },
    ...(isIt ? [{ k: "source", label: t("settings.tabSource") }] : []),
    { k: "targets", label: t("settings.tabTargets") },
    { k: "users", label: t("settings.tabUsers") },
    { k: "document", label: t("settings.tabDocument") },
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
                {[{ v: "lineTotal", l: t("settings.gmvLine") }, { v: "netRevenue", l: t("settings.gmvNet") }, { v: "vtecPrice", l: t("settings.gmvVtec") }].map((o) => (
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

            {/* ชีตเสริม (หลาย platform / สาขา) */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className={heading}>{t("admin.extraTitle")}</h3>
              <p className="mb-3 text-[11px] leading-relaxed text-slate-400">{t("admin.extraDesc")}</p>
              <div className="space-y-2">
                {extras.length === 0 && (
                  <p className="text-xs text-slate-400">{t("admin.extraEmpty")}</p>
                )}
                {extras.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={s.platform || ""}
                        onChange={(e) => updateExtra(i, { platform: e.target.value })}
                        placeholder={t("admin.extraPlatform")}
                        className={`${field} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => removeExtra(i)}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50"
                      >
                        {lang === "en" ? "Remove" : "ลบ"}
                      </button>
                    </div>
                    <input
                      value={s.url || ""}
                      onChange={(e) => updateExtra(i, { url: e.target.value })}
                      placeholder={t("admin.extraUrl")}
                      className={`${field} w-full break-all`}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExtraRow}
                className="mt-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
              >
                + {t("admin.extraAdd")}
              </button>
              {extraStatus && (
                <p className={`mt-2 text-xs font-bold ${extraStatus.type === "success" ? "text-emerald-600" : "text-rose-500"}`}>{extraStatus.msg}</p>
              )}
              <div className="mt-3 flex justify-end">
                <button onClick={saveExtras} disabled={extraBusy} className={saveBtn}>
                  {extraBusy ? t("admin.saving") : t("admin.save")}
                </button>
              </div>
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
                <div key={u.username} className="rounded-2xl bg-slate-50">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-black uppercase text-white">{u.username.slice(0, 1)}</span>
                      <div className="min-w-0 leading-tight">
                        <p className="text-xs font-bold text-slate-700">{u.username}</p>
                        <p className="truncate text-[9px] font-black uppercase tracking-wider text-indigo-500">
                          {t(`role.${u.role}`)} · <span className="normal-case text-slate-400">{accessSummary(u.access)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => openPin(u)} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100">
                        {t("admin.resetPin")}
                      </button>
                      <button onClick={() => openAccess(u)} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-50">
                        {t("access.edit")}
                      </button>
                      <button onClick={() => delUser(u.username)} className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50">
                        {lang === "en" ? "Delete" : "ลบ"}
                      </button>
                    </div>
                  </div>

                  {pinFor === u.username && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("admin.newPin")}</span>
                      <input
                        value={pinDraft}
                        onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t("admin.newPinHint")}
                        className={`${field} w-32`}
                      />
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => setPinFor(null)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100">
                          {t("access.cancel")}
                        </button>
                        <button onClick={saveResetPin} disabled={pinBusy || pinDraft.length < 4} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-slate-900 disabled:opacity-40">
                          {pinBusy ? t("admin.savingUser") : t("admin.resetPin")}
                        </button>
                      </div>
                    </div>
                  )}

                  {accessFor === u.username && accessDraft && (
                    <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <input type="checkbox" checked={accessDraft.overview} onChange={(e) => setAccessDraft((d) => ({ ...d, overview: e.target.checked }))} />
                        {t("access.overview")}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { v: "all", l: t("access.all") },
                          { v: "allow", l: t("access.modeAllow") },
                          { v: "deny", l: t("access.modeDeny") },
                        ].map((m) => (
                          <button
                            key={m.v}
                            type="button"
                            onClick={() => setAccessDraft((d) => ({ ...d, mode: m.v }))}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                              accessDraft.mode === m.v ? "bg-slate-800 text-white" : "border border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            {m.l}
                          </button>
                        ))}
                      </div>
                      {accessDraft.mode !== "all" && (
                        <div className="flex flex-wrap gap-1.5">
                          {platforms.length === 0 ? (
                            <span className="text-[11px] text-slate-400">{t("access.noPlatforms")}</span>
                          ) : (
                            platforms.map((p) => {
                              const on = accessDraft.platforms.includes(p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => togglePlat(p)}
                                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                                    on ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-500"
                                  }`}
                                >
                                  {p}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setAccessFor(null)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100">
                          {t("access.cancel")}
                        </button>
                        <button onClick={saveAccess} disabled={accessBusy} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-indigo-700 disabled:opacity-40">
                          {accessBusy ? t("admin.savingUser") : t("access.save")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-3">
              <input value={nu.username} onChange={(e) => setNu((s) => ({ ...s, username: e.target.value }))} placeholder={t("login.username")} className={`${field} min-w-28 flex-1`} />
              <input value={nu.pin} onChange={(e) => setNu((s) => ({ ...s, pin: e.target.value.replace(/\D/g, "").slice(0, 12) }))} type="password" inputMode="numeric" placeholder={t("admin.userPin")} className={`${field} w-28`} />
              <select value={nu.role} onChange={(e) => setNu((s) => ({ ...s, role: e.target.value }))} className={`${field} cursor-pointer`}>
                <option value="viewer">{t("role.viewer")}</option>
                <option value="executive">{t("role.executive")}</option>
                <option value="admin">{t("role.admin")}</option>
                {isIt && <option value="itsupport">{t("role.itsupport")}</option>}
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

        {/* ===== เอกสารแหล่งข้อมูล (Document) — พจนานุกรมข้อมูล สไตล์หัวข้อเดียวกับแท็บอื่น ===== */}
        {tab === "document" && (
          <div className="space-y-6">
            {/* หัวเอกสาร */}
            <div className="flex items-start gap-2.5 border-b border-slate-100 pb-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
                <IconDocument className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-800">{t("doc.docTitle")}</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t("doc.desc")}</p>
              </div>
            </div>

            {/* แต่ละชีต = หนึ่งหัวข้อ (ใช้สไตล์ heading เดียวกับแท็บอื่น) */}
            {DATA_DOCS.map((d, i) => (
              <section key={d.sheet}>
                <h3 className={heading}>
                  {t("doc.sheet")} {i + 1} — {d.sheet}
                </h3>
                <p className="-mt-2 mb-2 text-[11px] font-bold text-slate-400">
                  {t("doc.tab")}: <span className="text-slate-600">{d.tab}</span>
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-3 py-2">{t("doc.hCol")}</th>
                        <th className="px-3 py-2">{t("doc.hHeader")}</th>
                        <th className="px-3 py-2">{t("doc.hUse")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.columns.map((c) => (
                        <tr
                          key={c.col}
                          className={`border-t border-slate-100 ${c.active ? "bg-indigo-50/60" : ""}`}
                        >
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 font-black ${
                                c.active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {c.col}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top font-bold text-slate-700">{c.header}</td>
                          <td className={`px-3 py-2 align-top ${c.active ? "font-bold text-indigo-700" : "text-slate-500"}`}>
                            {c.use}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            {/* รายงานเมล็ดกาแฟ — เป็นอีกหนึ่งหัวข้อ (สไตล์เดียวกัน โทนนิวทรัล) */}
            <section>
              <h3 className={heading}>{t("doc.beanTitle")}</h3>
              <div className="space-y-2 rounded-xl border border-slate-100 p-4 text-[11px] leading-relaxed text-slate-500">
                <p>{t("doc.beanDesc")}</p>
                <div className="flex gap-2">
                  <span className="w-14 shrink-0 pt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {t("doc.beanRuleLabel")}
                  </span>
                  <span className="flex-1">{t("doc.beanRule")}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-14 shrink-0 pt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {t("doc.beanFilterLabel")}
                  </span>
                  <span className="flex-1">{t("doc.beanFilters")}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-14 shrink-0 pt-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {t("doc.hCol")}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {["Product Name", "Category", "จำนวน", "ราคาคีย์ VTEC", "แพลตฟอร์มขาย", "วันที่"].map((c) => (
                      <span
                        key={c}
                        className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-600"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ท้ายเอกสาร */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-[11px] leading-relaxed text-slate-400">{t("doc.note")}</p>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-black text-slate-400">→</span>
                <p className="text-xs font-bold text-slate-600">{t("doc.combined")}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
