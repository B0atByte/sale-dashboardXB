# xBloom Dashboard — Backend

Backend API สำหรับแดชบอร์ดยอดขาย ดึงข้อมูลจาก Google Sheets (publish เป็น CSV)
แล้วแปลงเป็น JSON พร้อม cache ในหน่วยความจำ

## ความต้องการของระบบ

- Node.js เวอร์ชัน 20 ขึ้นไป
- ไฟล์ `.env` ที่ตั้งค่าครบ (ดู `.env.example`)

## การติดตั้ง

```bash
cd backend
npm install
cp .env.example .env   # แล้วแก้ค่าในไฟล์ .env ให้ถูกต้อง
```

## การรัน

```bash
npm run dev    # โหมดพัฒนา (restart อัตโนมัติเมื่อไฟล์เปลี่ยน)
npm start      # โหมดปกติ
```

เซิร์ฟเวอร์จะรับฟังที่พอร์ต `PORT` (ค่าเริ่มต้น 3001)

### รันด้วย Docker

```bash
docker build -t xbloom-backend .
docker run -p 3001:3001 --env-file .env xbloom-backend
```

## ตัวแปรสภาพแวดล้อม (.env)

| ตัวแปร | จำเป็น | คำอธิบาย |
| --- | --- | --- |
| `SHEET_CSV_URL` | ใช่ | URL ของ Google Sheets ที่ publish เป็น CSV |
| `API_KEY` | ใช่ | คีย์ลับสำหรับตรวจ header `x-api-key` |
| `PORT` | ไม่ | พอร์ตของเซิร์ฟเวอร์ (ค่าเริ่มต้น `3001`) |
| `CACHE_TTL_SECONDS` | ไม่ | อายุ cache ข้อมูลชีทเป็นวินาที (ค่าเริ่มต้น `300`) |

## Endpoints

ทุกเส้นทางยกเว้น `/api/health` ต้องส่ง header `x-api-key: <API_KEY>`
ถ้าคีย์ผิดหรือไม่ได้ส่ง จะได้ `401 {"error":"unauthorized"}`

### `GET /api/health`

ตรวจสถานะเซิร์ฟเวอร์ (ไม่ต้องใช้คีย์ — ใช้กับ Docker healthcheck)

ตอบ: `200 {"ok":true}`

### `GET /api/sales`

รายการขายทั้งหมด รองรับ query string (ใส่หรือไม่ใส่ก็ได้):

- `from` — วันที่เริ่มต้น รูปแบบ `YYYY-MM-DD` (นับรวม)
- `to` — วันที่สิ้นสุด รูปแบบ `YYYY-MM-DD` (นับรวม)
- `platform` — ชื่อแพลตฟอร์ม เช่น `Shopee` (ไม่สนตัวพิมพ์เล็ก/ใหญ่)

ตัวอย่าง:

```bash
curl -H "x-api-key: <API_KEY>" \
  "http://localhost:3001/api/sales?from=2026-06-01&to=2026-06-30&platform=Shopee"
```

ตอบ:

```json
{
  "updatedAt": "2026-07-17T04:00:00.000Z",
  "fromCache": false,
  "count": 1,
  "records": [
    {
      "id": "5-260530QRJR9GN7",
      "date": "2026-06-02",
      "platform": "Shopee",
      "customer": "thamthornsuksawat",
      "orderNo": "260530QRJR9GN7",
      "productName": "xBloom Premium Filter Paper",
      "productId": "XBLM000015",
      "category": "xBloom Premium Filter Paper",
      "campaign": "BAU",
      "quantity": 1,
      "lineTotal": 300,
      "netRevenue": 226
    }
  ]
}
```

### `GET /api/sales/summary`

สรุปภาพรวม (รองรับ filter ชุดเดียวกับ `/api/sales`)

ตอบ:

```json
{
  "updatedAt": "...",
  "fromCache": false,
  "kpi": {
    "totalGmv": 0,
    "totalOrders": 0,
    "totalUnits": 0,
    "totalNetRevenue": 0,
    "aov": 0
  },
  "topProducts": [
    { "name": "...", "category": "...", "units": 0, "gmv": 0 }
  ],
  "byPlatform": [
    { "platform": "...", "gmv": 0, "orders": 0, "units": 0 }
  ]
}
```

- `totalGmv` = ผลรวม `lineTotal`
- `totalUnits` = ผลรวม `quantity`
- `totalOrders` = จำนวนหมายเลขคำสั่งซื้อที่ไม่ซ้ำกัน
- `aov` = `totalGmv / totalOrders` (0 ถ้าไม่มีคำสั่งซื้อ)
- `topProducts` = สินค้าขายดีสูงสุด 5 อันดับ เรียงตาม `gmv`
- `byPlatform` = ยอดขายแยกตามแพลตฟอร์ม เรียงตาม `gmv`

### กรณี upstream ล้มเหลว

- ถ้าดึงข้อมูลจาก Google Sheets ไม่สำเร็จแต่มี cache เก่าอยู่ จะเสิร์ฟ cache เดิม
  พร้อม `"fromCache": true`
- ถ้าไม่มี cache เลย จะตอบ `502 {"error":"sheet_fetch_failed"}`

## โครงสร้างโปรเจกต์

```
backend/
├── src/
│   ├── server.js            # จุดเริ่มต้น Express app
│   ├── config.js            # โหลดและตรวจสอบ .env
│   ├── middleware/
│   │   └── apiKey.js        # ตรวจ x-api-key แบบ timing-safe
│   ├── services/
│   │   ├── sheets.js        # ดึง CSV + cache + stale fallback
│   │   └── parser.js        # แปลง CSV เป็น records
│   └── routes/
│       └── sales.js         # /api/sales และ /api/sales/summary
├── Dockerfile
├── .env.example
└── README.md
```
