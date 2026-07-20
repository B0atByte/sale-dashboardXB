import { useCallback, useEffect, useState } from "react";

/**
 * useAuth — ล็อกอินด้วย username + PIN, เก็บข้อมูลผู้ใช้ (username, role)
 * cookie httpOnly จัดการโดย backend (JS อ่านไม่ได้)
 */
export default function useAuth() {
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/session", { credentials: "same-origin", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((d) => {
        setUser(d.user || null);
        setChecked(true);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setChecked(true);
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (username, pin) => {
    let res;
    try {
      res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, pin }),
      });
    } catch {
      return { ok: false };
    }
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      setUser(d.user || null);
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
      /* ไม่เป็นไร */
    }
    setUser(null);
  }, []);

  return { checked, authed: Boolean(user), user, login, logout };
}
