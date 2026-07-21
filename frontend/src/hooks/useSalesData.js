import { useCallback, useEffect, useRef, useState } from "react";
import { shiftRange } from "../utils/data";

/** รอบรีเฟรชอัตโนมัติเริ่มต้น (แอดมินปรับได้ในหน้าตั้งค่า) — 60 วิ เพื่อไม่ยิง Google Sheet ถี่เกิน */
export const REFRESH_INTERVAL_MS = 60000;

async function fetchJson(url, signal) {
  const res = await fetch(url, { credentials: "same-origin", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** ประกอบ query string จากตัวกรองที่มีค่า */
function buildQuery({ from, to, platform, category, campaign, product } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (platform) params.set("platform", platform);
  if (category) params.set("category", category);
  if (campaign) params.set("campaign", campaign);
  if (product) params.set("product", product);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Hook หลัก — ดึง /api/sales และ /api/sales/summary พร้อมกัน, รีเฟรชอัตโนมัติ
 */
export default function useSalesData(filters, refreshMs = REFRESH_INTERVAL_MS) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(
    async (force = false, silent = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!silent) setLoading(true);
      setError(false);

      const query = buildQuery(filters);
      const freshQ = force ? (query ? "&fresh=1" : "?fresh=1") : "";
      try {
        const [sales, sum] = await Promise.all([
          fetchJson(`/api/sales${query}${freshQ}`, controller.signal),
          fetchJson(`/api/sales/summary${query}${freshQ}`, controller.signal),
        ]);
        setRecords(sales.records ?? []);
        setSummary(sum);
        setUpdatedAt(sum.updatedAt ?? sales.updatedAt ?? null);
        setFromCache(Boolean(sum.fromCache || sales.fromCache));
        setStale(Boolean(sum.stale || sales.stale));
        setLoading(false);
      } catch (err) {
        if (err.name === "AbortError") return;
        // refresh เบื้องหลัง (silent) ที่พลาดชั่วคราว: คงข้อมูลเดิมไว้ ไม่เด้ง error ให้ UI กระพริบ
        // แสดง error เฉพาะตอนโหลดครั้งแรก/เปลี่ยนตัวกรอง (foreground) เท่านั้น
        if (!silent) setError(true);
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.from, filters.to, filters.platform, filters.category, filters.campaign, filters.product]
  );

  useEffect(() => {
    load();
    // auto-refresh แบบไม่บังคับสด (รอบตามตั้งค่า)
    const timerId = setInterval(() => load(false, true), refreshMs);
    return () => {
      clearInterval(timerId);
      abortRef.current?.abort();
    };
  }, [load, refreshMs]);

  return {
    records,
    summary,
    updatedAt,
    fromCache,
    stale,
    loading,
    error,
    refresh: () => load(true),
  };
}

/**
 * ดึงตัวเลือกฟิลเตอร์จาก summary แบบไม่กรอง (ช่องทาง + แคมเปญ) — เรียกครั้งเดียวตอน mount
 */
export function useFilterOptions() {
  const [options, setOptions] = useState({ platforms: [], campaigns: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetchJson("/api/sales/summary", controller.signal)
      .then((data) => {
        const platforms = (data.byPlatform ?? [])
          .slice()
          .sort((a, b) => (b.gmv || 0) - (a.gmv || 0))
          .map((p) => String(p.platform || "").trim())
          .filter(Boolean);
        setOptions({ platforms, campaigns: data.campaigns ?? [] });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return options;
}

/**
 * เทียบยอดกับปีก่อน/สัปดาห์ก่อน/เดือนก่อน (VS LY / VS LW / VS LM)
 * - ใช้ช่วงวันที่ที่เลือก ถ้าไม่ได้เลือก ใช้ช่วงของข้อมูลจริง (span) แทน → แสดงอัตโนมัติเสมอ
 * - VS LY = เลื่อนย้อน 1 ปี (ช่วงวันเดียวกัน), VS LW = ย้อน 7 วัน, VS LM = ย้อน 30 วัน
 * คืน { ly, lw, lm } โดยแต่ละตัวเป็น kpi object (หรือ null)
 */
export function useComparisons(filters, span) {
  const [cmp, setCmp] = useState(null);
  const from = filters.from || span?.from || "";
  const to = filters.to || span?.to || "";
  const hasRange = Boolean(from && to);
  const key = hasRange
    ? JSON.stringify({
        from,
        to,
        platform: filters.platform,
        category: filters.category,
        campaign: filters.campaign,
        product: filters.product,
      })
    : "";

  useEffect(() => {
    if (!hasRange) {
      setCmp(null);
      return;
    }
    const controller = new AbortController();
    const fetchKpi = (kind) => {
      const shifted = shiftRange(from, to, kind);
      const q = buildQuery({ ...filters, from: shifted.from, to: shifted.to });
      return fetchJson(`/api/sales/summary${q}`, controller.signal)
        .then((d) => d.kpi ?? null)
        .catch(() => null);
    };
    Promise.all([fetchKpi("year"), fetchKpi("week"), fetchKpi("month")])
      .then(([ly, lw, lm]) => setCmp({ ly, lw, lm }))
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return cmp;
}
