/**
 * เส้น sparkline เล็ก ๆ จาก array ตัวเลข (SVG inline)
 * คืน null ถ้าจุดข้อมูลน้อยกว่า 2 จุด — ไม่วาดข้อมูลปลอมเหมือนแดชบอร์ดเดิม
 */
export default function Sparkline({
  data = [],
  width = 64,
  height = 28,
  color = "#6366f1",
}) {
  if (!Array.isArray(data) || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
