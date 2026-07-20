/**
 * ป้าย "DEMO" กำกับว่าเป็นระบบตัวอย่าง (ยังไม่ใช่ข้อมูล/ระบบจริง)
 */
export default function DemoBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700 ${className}`}
    >
      Demo
    </span>
  );
}
