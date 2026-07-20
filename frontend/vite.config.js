import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// SECURITY: API_KEY ถูกอ่านจากไฟล์ .env ด้วย loadEnv(mode, cwd, "") แบบไม่มี prefix
// (ไม่ใช่ VITE_*) จึง "ไม่มีทาง" ถูก inline เข้าไปใน client bundle ได้ —
// คีย์ถูกใช้เฉพาะฝั่ง dev server (Node) เพื่อแนบ header ให้ proxy เท่านั้น
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // ทุก request ที่ขึ้นต้นด้วย /api จะถูกส่งต่อไปยัง backend
        // พร้อมแนบ x-api-key จากฝั่งเซิร์ฟเวอร์ (เบราว์เซอร์ไม่เคยเห็นคีย์)
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          headers: {
            "x-api-key": env.API_KEY ?? "",
          },
        },
      },
    },
  };
});
