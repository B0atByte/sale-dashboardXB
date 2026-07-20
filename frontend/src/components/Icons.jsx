/**
 * ไอคอน SVG แบบ inline (ไม่พึ่งไลบรารีภายนอก)
 * ทุกไอคอนรับ prop `className` เพื่อกำหนดขนาด/สีผ่าน Tailwind
 */

const BASE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function IconRefresh({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function IconSearch({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconDownload({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function IconTrendUp({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </svg>
  );
}

export function IconTrendDown({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M23 18l-9.5-9.5-5 5L1 6" />
      <path d="M17 18h6v-6" />
    </svg>
  );
}

export function IconChevronLeft({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function IconLogout({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconSparkles({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

export function IconSend({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

export function IconX({ className = "" }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
