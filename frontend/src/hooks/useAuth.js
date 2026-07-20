import { useCallback, useEffect, useState } from "react";

/**
 * useAuth — จัดการล็อกอินด้วยรหัสเข้าระบบ
 * - เช็ค /api/session ตอนโหลดแอป เพื่อรู้ว่าต้องขึ้นหน้าใส่รหัสไหม
 * - login(code) ยิง POST /api/login (backend ออก cookie httpOnly ให้)
 * - cookie ถูกส่งอัตโนมัติกับทุก request แบบ same-origin (โค้ด JS อ่าน cookie ไม่ได้)
 */
export default function useAuth() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/session", { credentials: "same-origin", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { authenticated: false, authRequired: true }))
      .then((d) => {
        // ถ้า backend ไม่ได้ตั้งรหัส (authRequired=false) ให้เข้าได้เลย
        setAuthed(Boolean(d.authenticated) || d.authRequired === false);
        setChecked(true);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setChecked(true);
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (code) => {
    let res;
    try {
      res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "same-origin",
      });
    } catch {
      return { ok: false };
    }
    if (res.ok) {
      setAuthed(true);
      return { ok: true };
    }
    if (res.status === 429) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, locked: true, retryAfter: d.retryAfter };
    }
    return { ok: false };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      /* ไม่เป็นไรถ้ายิง logout ไม่สำเร็จ */
    }
    setAuthed(false);
  }, []);

  return { checked, authed, login, logout };
}
