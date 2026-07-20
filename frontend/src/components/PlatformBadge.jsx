import { platformColor } from "../utils/data";

/**
 * ป้ายช่องทาง: จุดสีประจำช่องทาง + ชื่อ (ไม่ใช่ badge พื้นทึบ)
 * สีผูกกับชื่อช่องทางเสมอ (ผ่าน platformColor)
 */
export default function PlatformBadge({ platform }) {
  const name = String(platform || "-").trim() || "-";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: platformColor(platform) }}
      />
      <span className="font-medium text-slate-700">{name}</span>
    </span>
  );
}
