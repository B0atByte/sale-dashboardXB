import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "xbloom_lang";

/**
 * พจนานุกรมข้อความ 2 ภาษา (ไทย/อังกฤษ)
 * ใช้ผ่าน t("key") — รองรับตัวแปรแบบ {n} เช่น t("table.page", { p, t })
 */
const TRANSLATIONS = {
  th: {
    "brand.subtitle": "แดชบอร์ดยอดขาย",
    "nav.section": "ช่องทางขาย",
    "nav.overview": "ภาพรวม",
    "header.updated": "อัปเดตล่าสุด",
    "header.autoRefresh": "รีเฟรชอัตโนมัติทุก 20 วินาที",
    "header.refresh": "รีเฟรชข้อมูล",
    "header.logout": "ออกจากระบบ",
    "gate.subtitle": "กรุณาใส่รหัสเข้าระบบ",
    "gate.submit": "เข้าสู่ระบบ",
    "gate.checking": "กำลังตรวจสอบ...",
    "gate.wrong": "รหัสไม่ถูกต้อง",
    "gate.locked": "ใส่รหัสผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
    "header.stale": "ข้อมูลอาจไม่เป็นปัจจุบัน — เชื่อมต่อ Google Sheets ไม่ได้",
    "header.staleTitle": "ดึงข้อมูลล่าสุดไม่สำเร็จ ระบบแสดงข้อมูลสำรองที่บันทึกไว้",
    "filter.dateRange": "ช่วงวันที่",
    "filter.quick": "ช่วงด่วน",
    "filter.from": "จากวันที่",
    "filter.to": "ถึงวันที่",
    "filter.clear": "ล้างตัวกรอง",
    "preset.today": "วันนี้",
    "preset.last7": "7 วันล่าสุด",
    "preset.thisMonth": "เดือนนี้",
    "preset.all": "ทั้งหมด",
    "kpi.gmv": "ยอดขายรวม",
    "kpi.orders": "จำนวนออเดอร์",
    "kpi.units": "จำนวนชิ้นที่ขาย",
    "kpi.aov": "ยอดขายเฉลี่ยต่อออเดอร์",
    "kpi.comparePrev": "เทียบช่วงก่อนหน้า",
    "kpi.compareTitle": "เทียบกับช่วงก่อนหน้าที่ยาวเท่ากัน",
    "chart.platformShare": "สัดส่วนตามช่องทาง",
    "chart.platformShareSub": "ยอดขายแยกตามแพลตฟอร์ม",
    "chart.campaignShare": "สัดส่วนแคมเปญ",
    "chart.campaignShareSub": "ยอดขายแยกตามแคมเปญ",
    "chart.categoryShare": "สัดส่วนหมวดสินค้า",
    "chart.categoryShareSub": "แบ่งเป็น 3 กลุ่มหลัก",
    "chart.total": "รวม",
    "chart.ofTotal": "ของยอดรวม",
    "chart.orders": "ออเดอร์",
    "chart.noData": "ไม่มีข้อมูลในช่วงที่เลือก",
    "trend.title": "แนวโน้มยอดขายรายวัน",
    "trend.sub": "ยอดขาย (GMV) รวมต่อวัน",
    "trend.needMore": "ข้อมูลไม่พอสำหรับแสดงแนวโน้ม (ต้องมีอย่างน้อย 2 วัน)",
    "top.title": "สินค้าขายดี Top 5",
    "top.sub": "จัดอันดับตามยอดขาย (GMV)",
    "top.units": "ชิ้น",
    "top.noData": "ไม่มีข้อมูลสินค้าในช่วงที่เลือก",
    "table.title": "รายการขาย",
    "table.allCount": "ทั้งหมด {n} รายการ",
    "table.foundCount": "พบ {n} จาก {total} รายการ",
    "table.search": "ค้นหาสินค้าในตาราง...",
    "table.export": "ส่งออก CSV",
    "table.noData": "ไม่พบข้อมูลตามเงื่อนไขที่เลือก",
    "table.page": "หน้า {p} จาก {t}",
    "table.prev": "ก่อนหน้า",
    "table.next": "ถัดไป",
    "col.date": "วันที่",
    "col.platform": "ช่องทาง",
    "col.customer": "ลูกค้า",
    "col.order": "เลขคำสั่งซื้อ",
    "col.product": "สินค้า",
    "col.category": "หมวดหมู่",
    "col.campaign": "แคมเปญ",
    "col.qty": "จำนวน",
    "col.amount": "ยอดขาย",
    "col.net": "รายรับสุทธิ",
    "cat.studio": "xBloom Studio",
    "cat.consumables": "xPod & เมล็ดกาแฟ",
    "cat.accessories": "อุปกรณ์เสริม",
    "common.other": "อื่น ๆ",
    "common.na": "ไม่ระบุ",
    "error.load": "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่",
    "error.retry": "ลองใหม่",
    "loading": "กำลังโหลดข้อมูล...",
    "loading.fetching": "กำลังดึงข้อมูล",
    "ai.insight.title": "AI สรุปยอดขาย",
    "ai.insight.loading": "AI กำลังวิเคราะห์ข้อมูล...",
    "ai.insight.error": "AI ไม่พร้อมใช้งานตอนนี้ — ลองใหม่อีกครั้ง",
    "ai.insight.refresh": "วิเคราะห์ใหม่",
    "ai.chat.title": "ถาม AI เรื่องยอดขาย",
    "ai.chat.open": "ถาม AI",
    "ai.chat.placeholder": "พิมพ์คำถาม เช่น ช่องทางไหนขายดีสุด?",
    "ai.chat.thinking": "AI กำลังคิด...",
    "ai.chat.error": "ขออภัย AI ตอบไม่ได้ตอนนี้",
    "ai.chat.empty": "ถามอะไรก็ได้เกี่ยวกับยอดขาย เช่น สินค้าไหนขายดี หรือช่องทางไหนโตขึ้น",
    "footer": "© 2026 xBloomXCasalapin",
  },
  en: {
    "brand.subtitle": "Sales Dashboard",
    "nav.section": "Sales Channels",
    "nav.overview": "Overview",
    "header.updated": "Updated",
    "header.autoRefresh": "Auto-refresh every 20 sec",
    "header.refresh": "Refresh data",
    "header.logout": "Sign out",
    "gate.subtitle": "Enter your access code",
    "gate.submit": "Sign in",
    "gate.checking": "Checking...",
    "gate.wrong": "Incorrect code",
    "gate.locked": "Too many attempts. Please wait a moment and try again.",
    "header.stale": "Data may be outdated — can't reach Google Sheets",
    "header.staleTitle": "Couldn't fetch the latest data; showing the last cached copy",
    "filter.dateRange": "Date range",
    "filter.quick": "Quick range",
    "filter.from": "From",
    "filter.to": "To",
    "filter.clear": "Clear filters",
    "preset.today": "Today",
    "preset.last7": "Last 7 days",
    "preset.thisMonth": "This month",
    "preset.all": "All",
    "kpi.gmv": "Total Sales",
    "kpi.orders": "Orders",
    "kpi.units": "Units Sold",
    "kpi.aov": "Avg. per Order",
    "kpi.comparePrev": "vs previous period",
    "kpi.compareTitle": "Compared with the previous period of equal length",
    "chart.platformShare": "Sales by Channel",
    "chart.platformShareSub": "Revenue split by platform",
    "chart.campaignShare": "Sales by Campaign",
    "chart.campaignShareSub": "Revenue split by campaign",
    "chart.categoryShare": "Sales by Category",
    "chart.categoryShareSub": "Grouped into 3 main buckets",
    "chart.total": "Total",
    "chart.ofTotal": "of total",
    "chart.orders": "orders",
    "chart.noData": "No data for the selected range",
    "trend.title": "Daily Sales Trend",
    "trend.sub": "Total GMV per day",
    "trend.needMore": "Not enough data to show a trend (need at least 2 days)",
    "top.title": "Top 5 Products",
    "top.sub": "Ranked by sales (GMV)",
    "top.units": "pcs",
    "top.noData": "No product data for the selected range",
    "table.title": "Sales Records",
    "table.allCount": "{n} records total",
    "table.foundCount": "Found {n} of {total} records",
    "table.search": "Search products in table...",
    "table.export": "Export CSV",
    "table.noData": "No records match the selected filters",
    "table.page": "Page {p} of {t}",
    "table.prev": "Previous",
    "table.next": "Next",
    "col.date": "Date",
    "col.platform": "Channel",
    "col.customer": "Customer",
    "col.order": "Order No.",
    "col.product": "Product",
    "col.category": "Category",
    "col.campaign": "Campaign",
    "col.qty": "Qty",
    "col.amount": "Sales",
    "col.net": "Net Revenue",
    "cat.studio": "xBloom Studio",
    "cat.consumables": "xPod & Beans",
    "cat.accessories": "Accessories",
    "common.other": "Other",
    "common.na": "N/A",
    "error.load": "Couldn't load data. Please try again.",
    "error.retry": "Retry",
    "loading": "Loading data...",
    "loading.fetching": "Fetching data",
    "ai.insight.title": "AI Summary",
    "ai.insight.loading": "AI is analyzing the data...",
    "ai.insight.error": "AI is unavailable right now — please try again",
    "ai.insight.refresh": "Re-analyze",
    "ai.chat.title": "Ask AI about sales",
    "ai.chat.open": "Ask AI",
    "ai.chat.placeholder": "Ask e.g. which channel sells best?",
    "ai.chat.thinking": "AI is thinking...",
    "ai.chat.error": "Sorry, AI can't respond right now",
    "ai.chat.empty": "Ask anything about your sales — e.g. which product sells best, or which channel is growing",
    "footer": "© 2026 xBloomXCasalapin",
  },
};

const LangContext = createContext(null);

/** ภาษาเริ่มต้น: ?lang= ใน URL > localStorage > "th" */
function getInitialLang() {
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "th" || q === "en") return q;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th" || saved === "en") return saved;
  } catch {
    /* ไม่มี window/localStorage ก็ใช้ค่าเริ่มต้น */
  }
  return "th";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ไม่ต้องทำอะไรถ้าเขียน localStorage ไม่ได้ */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.th;
    const t = (key, params) => {
      let s = dict[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    };
    return { lang, setLang, t };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
