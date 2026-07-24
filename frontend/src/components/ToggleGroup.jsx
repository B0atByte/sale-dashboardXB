/**
 * ปุ่มสลับกลุ่ม (ใช้ร่วมกันทั้งกราฟแนวโน้มและโดนัท ให้หน้าตาเหมือนกัน)
 * active = พื้นขาว ตัวหนังสือม่วง · inactive = เทาจาง
 */
export default function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-wide transition ${
            value === o.v
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
