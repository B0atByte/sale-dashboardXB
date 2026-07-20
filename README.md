# xBloom Sale Dashboard

แดชบอร์ดสรุปยอดขายหลายช่องทางของ **xBloom** — ดึงข้อมูลสดจาก **Google Sheets**, มีระบบล็อกอิน, รองรับ 2 ภาษา (ไทย/อังกฤษ) สร้างด้วย **React (Vite) + Express + Docker**

> ℹ️ ระบบนี้เป็น **DEMO** ใช้ข้อมูลตัวอย่างจาก Google Sheets สาธารณะ

---

## ✨ ความสามารถ

- 📊 **สรุปยอดขาย** — KPI (ยอดรวม / ออเดอร์ / จำนวนชิ้น / เฉลี่ยต่อออเดอร์), กราฟแนวโน้มรายวัน, โดนัทแยกช่องทาง–หมวดสินค้า–แคมเปญ, สินค้าขายดี Top 5
- 📋 **ตารางรายการขาย** — ค้นหาในตาราง, แบ่งหน้า, ส่งออกไฟล์ CSV
- 🔄 **ข้อมูลสด (near-realtime)** — ดึงจาก Google Sheets, แคช 15 วินาที, รีเฟรชอัตโนมัติทุก 20 วินาที, ปุ่มรีเฟรชดึงสดทันที
- 🔐 **ระบบล็อกอินด้วยรหัส** — บังคับตรวจที่เซิร์ฟเวอร์ (ไม่ใช่แค่ซ่อนหน้าจอ), กันเดารหัส, จำกัดจำนวน request (rate limit), security headers
- 🌐 **2 ภาษา** — ไทย / อังกฤษ (ปุ่มสลับ), ฟอนต์ LINE Seed Sans TH
- 📱 **Responsive** — เมนู sidebar บนจอใหญ่ / แท็บบนมือถือ

---

## 🚀 เริ่มใช้งานเร็ว (Docker — แนะนำ)

```bash
# 1) สร้างไฟล์ตั้งค่าจากตัวอย่าง
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
cp .env.example .env

# 2) แก้ค่าใน backend/.env (ลิงก์ชีต, API key, รหัสเข้าระบบ)
#    แล้วให้ API_KEY ใน frontend/.env และ .env (root) ตรงกับ backend/.env

# 3) รัน
docker compose up --build -d
```

เปิด <http://localhost:8081> → ใส่รหัสเข้าระบบ (ค่า `ACCESS_CODE` ที่ตั้งไว้)

| คำสั่ง Docker ที่ใช้บ่อย | ความหมาย |
|---|---|
| `docker compose up --build -d` | build + รัน (เบื้องหลัง) |
| `docker compose down` | หยุดระบบ |
| `docker compose logs -f` | ดู log สด |
| `docker compose restart backend` | รีสตาร์ท backend (หลังแก้ `.env`) |

---

## ⚙️ การตั้งค่า (ไฟล์ `.env`)

มี 3 ไฟล์ — **ทั้งหมดถูก `.gitignore` ไว้ ไม่ขึ้น GitHub** (มีไฟล์ `.env.example` เป็นตัวอย่างแทน)

| ไฟล์ | ตัวแปร | ใช้ทำอะไร |
|---|---|---|
| `backend/.env` | `SHEET_CSV_URL`, `API_KEY`, `ACCESS_CODE`, `PORT`, `CACHE_TTL_SECONDS` | ค่าหลักของ backend |
| `frontend/.env` | `API_KEY` | สำหรับ dev proxy (ต้องตรงกับ backend) |
| `.env` (root) | `API_KEY` | ให้ Docker ส่งคีย์ให้ nginx (ต้องตรงกัน) |

ค่าที่ต้องแก้:

- **`SHEET_CSV_URL`** — ลิงก์ Google Sheets แบบ CSV เช่น `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0` (ชีตต้องตั้งเป็น "ทุกคนที่มีลิงก์ดูได้")
- **`API_KEY`** — สตริงลับยาว ๆ (สุ่มด้วย `openssl rand -hex 24`) ต้อง **ตรงกันทั้ง 3 ไฟล์**
- **`ACCESS_CODE`** — รหัสเข้าระบบ (เว้นว่าง = ปิดการล็อกอิน)

---

## 🔐 ระบบล็อกอิน

เปิดเว็บจะเจอหน้าใส่รหัสก่อนเสมอ ใส่ค่า `ACCESS_CODE` เพื่อเข้า

- ตรวจรหัส **ที่เซิร์ฟเวอร์จริง** — ยิง `/api/sales` โดยไม่ล็อกอินจะได้ `401` (ข้อมูลไม่หลุด)
- ใส่รหัสถูก → ได้ session cookie แบบ `httpOnly` (อายุ 12 ชม.)
- ใส่ผิดครบ 5 ครั้ง → ล็อก 60 วินาที (กันเดารหัส)

---

## 💻 โหมดพัฒนา (dev) — เปิด 2 เทอร์มินัล

```bash
# เทอร์มินัล 1
cd backend  && npm install && npm run dev     # พอร์ต 3001

# เทอร์มินัล 2
cd frontend && npm install && npm run dev     # เปิดลิงก์ที่ Vite แจ้ง (~5173)
```

---

## 🏗️ สถาปัตยกรรม

```
                (แนบ x-api-key + session cookie)
Browser  :8081   nginx                    Express API :3001        Google Sheets
  │  ───────────▶  • เสิร์ฟหน้าเว็บ (SPA)   ───────────▶  • ตรวจ key + login   ─────▶  (CSV)
  │               • proxy /api/ + แนบ key   │             • แคช 15 วิ / rate limit
  ◀───────────────  • security headers      ◀─────────────  • คำนวณ KPI/สรุป
```

- **API key ไม่เคยอยู่ในเบราว์เซอร์** — nginx เป็นคนแนบให้ตอน proxy
- **backend ไม่เปิดพอร์ตออกเครื่อง** — เข้าถึงได้เฉพาะผ่าน nginx เท่านั้น

---

## 🔗 API

`/api/health` เปิดได้เลย · เส้นทางอื่นต้องมี `x-api-key` (nginx แนบให้) · เส้นทางข้อมูล (`/api/sales*`) ต้องล็อกอินแล้ว (มี session cookie)

| Method | Endpoint | Query (ไม่บังคับ) | คำอธิบาย |
|---|---|---|---|
| GET | `/api/health` | – | เช็คสถานะเซิร์ฟเวอร์ → `{"ok":true}` |
| POST | `/api/login` | body `{ "code": "…" }` | ตรวจรหัส ออก session cookie |
| POST | `/api/logout` | – | ออกจากระบบ |
| GET | `/api/sales` | `from`, `to`, `platform`, `fresh=1` | รายการขายรายแถว |
| GET | `/api/sales/summary` | `from`, `to`, `platform`, `fresh=1` | สรุป KPI + Top 5 + แยกช่องทาง |

- `from` / `to` รูปแบบ `YYYY-MM-DD` (รวมวันปลายทาง) · `fresh=1` = ข้ามแคชดึงสด
- `totalGmv` = ผลรวม `ราคาสินค้าขาย` (lineTotal), `totalOrders` = จำนวน `orderNo` ไม่ซ้ำ, `aov` = `totalGmv / totalOrders`

---

## 🛡️ ความปลอดภัย

ทำแล้ว: ✅ ล็อกอิน (บังคับที่ server) · ✅ API key ไม่หลุดใน frontend · ✅ rate limit (กัน `?fresh=1` ถล่ม) · ✅ security headers (CSP, X-Frame-Options ฯลฯ) · ✅ backend รัน non-root

**ก่อนขึ้นอินเทอร์เน็ตจริง ควรเพิ่ม:**

- 🔴 **HTTPS** (จำเป็น — ตอนนี้เป็น HTTP; เปิด `secure` cookie + HSTS เมื่อมี TLS)
- 🟠 เปลี่ยน Google Sheet เป็น **private + service account** (ตอนนี้ชีตสาธารณะ ใครมีลิงก์ก็ดูได้)
- 🟠 ใช้รหัสเข้าระบบที่ยาวขึ้น (รหัสสั้นเดาง่าย เหมาะกับใช้ในวง LAN เท่านั้น)

---

© 2026 xBloomXCasalapin
