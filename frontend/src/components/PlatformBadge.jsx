import { platformColor } from "../utils/data";

/**
 * ป้ายช่องทาง: ชิปสีประจำช่องทาง (พื้นจาง + ขอบ + ข้อความสีเดียวกัน) + จุดสี
 * สีผูกกับชื่อช่องทางเสมอ (ผ่าน platformColor) → ช่องทางเดียวกันสีเหมือนกันทุกที่ แยกกันดูง่าย
 */
export default function PlatformBadge({ platform }) {
  const name = String(platform || "-").trim() || "-";
  const color = platformColor(platform);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold"
      style={{ color, backgroundColor: `${color}14`, borderColor: `${color}33` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
