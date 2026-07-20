# xBloom Sales Dashboard — Frontend

แดชบอร์ดสรุปยอดขายของ xBloom สร้างด้วย **Vite + React 18 + react-router-dom + Tailwind CSS v4**
ดึงข้อมูลจาก backend API (`/api/sales`, `/api/sales/summary`) และรีเฟรชอัตโนมัติทุก 5 นาที

## สิ่งที่ต้องมี

- Node.js 18 ขึ้นไป (แนะนำ 20+)
- Backend API รันอยู่ที่ `http://localhost:3001` (สำหรับโหมดพัฒนา)

## ติดตั้ง

```bash
cd frontend
npm install
```

จากนั้นสร้างไฟล์ `.env` จากตัวอย่าง แล้วใส่คีย์ API จริง:

```bash
cp .env.example .env
# แก้ไข .env ให้ API_KEY ตรงกับคีย์ของ backend
```

## รันโหมดพัฒนา (dev)

> ต้องรัน backend ที่พอร์ต 3001 ก่อน ไม่เช่นนั้นหน้าเว็บจะแสดงแบนเนอร์
> "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่"

```bash
npm run dev
```

เปิดเบราว์เซอร์ตาม URL ที่ Vite แสดง (ปกติคือ `http://localhost:5173`)
ระบบจะ redirect จาก `/` ไปหน้า `/sales` อัตโนมัติ

## Build สำหรับ production

```bash
npm run build     # ได้ไฟล์ static ในโฟลเดอร์ dist/
npm run preview   # (ทางเลือก) ลองเปิดดูไฟล์ที่ build แล้ว
```

## การใช้งานผ่าน Docker

Dockerfile เป็นแบบ multi-stage:

1. **Stage build** — `node:24-alpine` รัน `npm ci` และ `npm run build`
2. **Stage serve** — `nginx:alpine` เสิร์ฟไฟล์จาก `dist/` และ proxy `/api/` ไปยัง service ชื่อ `backend`

```bash
# build image
docker build -t xbloom-frontend .

# รัน (ต้องส่ง API_KEY เป็น environment variable ให้ nginx แนบ header)
docker run -p 8080:80 \
  -e API_KEY=<คีย์จริงของ backend> \
  --name xbloom-frontend xbloom-frontend
```

ไฟล์ `nginx/default.conf.template` จะถูก `envsubst` โดย entrypoint ของ
nginx image ตอนสตาร์ต เพื่อแทนค่า `${API_KEY}` ลงใน config จริง
(ใน docker-compose ให้ตั้ง `environment: API_KEY=...` และมี service ชื่อ `backend` อยู่ใน network เดียวกัน)

## ทำไมคีย์ API ถึงอยู่แค่ในชั้น proxy? (สำคัญ)

**โค้ดฝั่งเบราว์เซอร์ไม่เคยถือหรือส่งคีย์ API เลย** — โดยตั้งใจออกแบบไว้แบบนี้:

- อะไรก็ตามที่อยู่ใน JavaScript bundle ของเบราว์เซอร์ถือว่า **เป็นข้อมูลสาธารณะ**
  ผู้ใช้ทุกคนเปิด DevTools อ่านได้ ดังนั้นถ้าฝังคีย์ลงไป คีย์ก็รั่วทันที
- ตัวแปรใน `.env` ที่ขึ้นต้นด้วย `VITE_` จะถูก Vite ฝังเข้า bundle —
  เราจึงใช้ชื่อ `API_KEY` **แบบไม่มี prefix** เพื่อให้ Vite ไม่มีทางนำค่านี้ไปไว้ในโค้ดฝั่ง client ได้
- **โหมด dev**: `vite.config.js` อ่าน `API_KEY` ด้วย `loadEnv` (รันใน Node ฝั่งเซิร์ฟเวอร์)
  แล้วให้ dev proxy แนบ header `x-api-key` ตอนส่งต่อ request `/api` ไปยัง backend
- **โหมด production**: nginx ทำหน้าที่เดียวกัน — proxy `/api/` ไป backend
  พร้อม `proxy_set_header x-api-key "${API_KEY}"` โดยรับคีย์จาก environment variable ของ container

ผลลัพธ์: เบราว์เซอร์เรียกแค่ path ภายใน (`/api/...`) โดยไม่มีความลับใด ๆ
ส่วนคีย์จริงอยู่เฉพาะฝั่งเซิร์ฟเวอร์ (dev proxy / nginx) ซึ่งผู้ใช้ภายนอกเข้าถึงไม่ได้

## โครงสร้างโปรเจกต์

```
frontend/
├── index.html                  # โหลดฟอนต์ Sarabun + จุด mount ของ React
├── vite.config.js              # dev proxy /api -> localhost:3001 (แนบ x-api-key)
├── .env / .env.example         # API_KEY สำหรับ dev proxy เท่านั้น
├── Dockerfile                  # multi-stage: build ด้วย Node แล้วเสิร์ฟด้วย nginx
├── nginx/default.conf.template # SPA + proxy /api/ พร้อมแนบ x-api-key
└── src/
    ├── App.jsx                 # เส้นทาง: / -> /sales
    ├── pages/SalesPage.jsx     # หน้าแดชบอร์ดหลัก
    ├── hooks/useSalesData.js   # ดึงข้อมูล + auto refresh 5 นาที + AbortController
    ├── components/             # Header, FilterBar, KpiCards, TopProducts,
    │                           # PlatformBreakdown, SalesTable, ErrorBanner ฯลฯ
    └── utils/format.js         # จัดรูปแบบตัวเลข/เงินบาท/วันที่แบบไทย
```
