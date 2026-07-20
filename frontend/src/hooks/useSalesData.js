import { useCallback, useEffect, useRef, useState } from "react";
import { previousRange } from "../utils/data";

/** รีเฟรชอัตโนมัติทุก 20 วินาที (near-realtime) */
export const REFRESH_INTERVAL_MS = 20000;

/**
 * เรียก API แบบ relative path (/api/...) เสมอ:
 * - โหมด dev: Vite proxy แนบ x-api-key ให้ฝั่งเซิร์ฟเวอร์
 * - โหมด production: nginx proxy แนบ x-api-key ให้
 * โค้ดฝั่งเบราว์เซอร์จึงไม่ต้องรู้จักคีย์ API เลย
 */
async function fetchJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

/** ประกอบ query string จากตัวกรองที่มีค่า */
function buildQuery({ from, to, platform }) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (platform) params.set("platform", platform);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Hook หลักสำหรับดึงข้อมูลยอดขาย:
 * - ดึง /api/sales และ /api/sales/summary พร้อมกัน (Promise.all)
 * - ยกเลิก request เก่าด้วย AbortController เมื่อตัวกรองเปลี่ยนหรือ unmount
 * - รีเฟรชอัตโนมัติทุก 5 นาที
 */
export default function useSalesData(filters) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  // stale = backend ดึง Google Sheets ไม่สำเร็จและเสิร์ฟแคชเก่าแทน (ไม่ใช่ cache hit ปกติ)
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async (force = false, silent = false) => {
    // ยกเลิก request ที่ค้างอยู่ก่อนเริ่มรอบใหม่
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // silent = การรีเฟรชเบื้องหลัง (auto ทุก 20 วิ) — ไม่โชว์สถานะโหลด/ป้าย
    if (!silent) setLoading(true);
    setError(false);

    const query = buildQuery(filters);
    // force=true (ปุ่มรีเฟรช): แนบ fresh=1 ให้ backend ข้ามแคชแล้วดึงสดจาก Google ทันที
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
      // ถูกยกเลิกเอง (เปลี่ยนตัวกรอง/unmount) ไม่ถือเป็น error
      if (err.name === "AbortError") return;
      setError(true);
      setLoading(false);
    }
    // filters ถูก destructure เป็นค่า primitive เพื่อให้ dependency เสถียร
  }, [filters.from, filters.to, filters.platform]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    // auto-refresh แบบไม่บังคับสด (TTL 15 วิ < รอบ 20 วิ จึงมักได้ข้อมูลใหม่อยู่แล้ว)
    const timerId = setInterval(() => load(false, true), REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(timerId);
      abortRef.current?.abort();
    };
  }, [load]);

  // ปุ่มรีเฟรช/ลองใหม่ = ดึงสดทันที (ข้ามแคชฝั่ง backend)
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
 * ดึงรายชื่อช่องทางทั้งหมดจาก summary แบบไม่กรอง (เรียกครั้งเดียวตอน mount)
 * เพื่อใช้เติมแท็บช่องทาง — จะได้เห็นทุกช่องทางเสมอแม้กำลังกรองข้อมูลอยู่
 * เรียงตาม GMV มากไปน้อย
 */
export function usePlatformOptions() {
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchJson("/api/sales/summary", controller.signal)
      .then((data) => {
        const list = (data.byPlatform ?? [])
          .slice()
          .sort((a, b) => (b.gmv || 0) - (a.gmv || 0))
          .map((p) => String(p.platform || "").trim())
          .filter(Boolean);
        setPlatforms(list);
      })
      .catch(() => {
        /* ไม่บล็อกหน้าจอหากดึงรายชื่อช่องทางไม่สำเร็จ */
      });
    return () => controller.abort();
  }, []);

  return platforms;
}

/**
 * ดึง KPI ของ "ช่วงก่อนหน้า" (ยาวเท่ากัน) เพื่อคำนวณ % เทียบ
 * ทำงานเฉพาะเมื่อมีช่วงวันที่ครบ (from & to); ไม่งั้นคืน null
 * ใช้ platform เดียวกับตัวกรองปัจจุบัน
 */
export function useComparisonSummary(filters) {
  const [prevKpi, setPrevKpi] = useState(null);
  const prev = previousRange(filters.from, filters.to);
  const prevKey = prev
    ? `${prev.from}|${prev.to}|${filters.platform || ""}`
    : "";

  useEffect(() => {
    if (!prev) {
      setPrevKpi(null);
      return;
    }
    const controller = new AbortController();
    const q = buildQuery({
      from: prev.from,
      to: prev.to,
      platform: filters.platform,
    });
    fetchJson(`/api/sales/summary${q}`, controller.signal)
      .then((data) => setPrevKpi(data.kpi ?? null))
      .catch(() => {
        /* ไม่บล็อก UI ถ้าดึงช่วงก่อนหน้าไม่สำเร็จ */
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevKey]);

  return prevKpi;
}
