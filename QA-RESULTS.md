# ผลทดสอบระบบ — xBloom Sales Dashboard

- **วันที่ทดสอบ:** 30 ก.ค. 2026
- **สภาพแวดล้อม:** http://localhost:8081 (Docker, local)
- **วิธี:** ทดสอบอัตโนมัติผ่าน API จริง (Node) + ตรวจหน้าจอด้วย Playwright/Edge
- **ผลรวม:** ✅ **ผ่าน 40 / 40** (API 30 + หน้าจอ 10) · ไม่มี FAIL

---

## 1) ผลฝั่ง API (30/30 ผ่าน)

| TC | รายการ | ผล | หลักฐาน |
|----|--------|----|---------|
| 1.1 | admin login สำเร็จ | PASS | status 200, role admin |
| 1.2 | PIN ผิดถูกปฏิเสธ | PASS | status 401 |
| 1.3 | ล็อกหลังผิด 5 ครั้ง | PASS | ครั้งที่ 6 = 429 |
| 1.4 | session คงอยู่ | PASS | authenticated=true |
| 1.6a | viewer login | PASS | role viewer |
| 1.6b | viewer ดูแดชบอร์ดได้ | PASS | status 200 |
| 1.6c | viewer เข้า admin ไม่ได้ | PASS | status 403 |
| 1.7a | admin เข้าแหล่งข้อมูลไม่ได้ | PASS | status 403 |
| 1.7b | admin เข้า Log ไม่ได้ | PASS | status 403 |
| 1.8 | itsupport login + เห็นแหล่งข้อมูล | PASS | role itsupport, source 200 |
| 2.1 | โหลดข้อมูล/มี KPI | PASS | GMV 4,274,888 · orders 879 |
| 2.2 | รีเฟรชสด (fromCache=false) | PASS | fromCache=false |
| 2.4 | รวม 2 ชีต (locations) | PASS | [Central World Branch, ออนไลน์] |
| 3.1/3.2 | exec ออนไลน์/CW ตรง summary | PASS | online 3,620,993 · central 653,895 |
| 3.3 | exec เมล็ดกาแฟ > 0 | PASS | beans 122,860 |
| 3.4 | ออนไลน์ + CW = ยอดรวม | PASS | 3,620,993 + 653,895 = 4,274,888 |
| 5.1 | ตัวกรองวันที่ลดจำนวน | PASS | 1159 / 2313 (มิ.ย.) |
| 5.3 | ตัวกรองสาขาแยกได้ | PASS | online/central แยกถูก |
| 5.4 | ตัวกรองหมวดสินค้า | PASS | consumables 971 รายการ |
| 5.6 | ค้นหาสินค้า | PASS | "xBloom" → 1062 แถว ตรงทุกแถว |
| 11.5 | ดึงข้อมูล Central World | PASS | 1,304 รายการ (CW ทั้งหมด), เมล็ด 122 |
| 12.5a | admin สร้าง itsupport ไม่ได้ | PASS | 403 forbidden_role |
| 12.5b | admin สร้าง viewer ได้ | PASS | 200 (สร้างแล้วลบทิ้ง) |
| 13.1 | IT เห็น Log | PASS | 47 รายการ |
| 13.2 | Log บันทึกล็อกอิน | PASS | มี login_success |
| 15.1 | API ต้องล็อกอิน | PASS | ไม่มี session → 401 |
| 15.4a | index.html no-cache | PASS | Cache-Control: no-cache |
| 15.4b | asset immutable cache | PASS | max-age=2592000, immutable |
| cleanup | ลบ user ทดสอบ | PASS | qa_viewer_tmp ลบแล้ว |

## 2) ผลฝั่งหน้าจอ (10/10 ผ่าน)

| TC | รายการ | ผล | หลักฐาน |
|----|--------|----|---------|
| 3.1–3.3 | Executive Summary 3 กล่อง | PASS | พบครบ (ออนไลน์ / Central World / เมล็ดกาแฟ) |
| 4.1 | การ์ด KPI | PASS | ยอดขายรวมแสดง |
| 6.3 | toggle ปี/เดือน/วัน | PASS | พบปุ่ม 3 จุด (โดนัท 2 + กราฟ 1) |
| 9.1 | ตารางเรียงได้ | PASS | กดหัวคอลัมน์แล้วแถวแรกเปลี่ยน |
| 10.1 | sidebar แยกกลุ่ม ออนไลน์/หน้าร้าน | PASS | เจอทั้งสองกลุ่ม |
| 11.1 | เมนูหน้าร้าน Central World | PASS | หัวข้อ + การ์ด BEANS 13 ใบ |
| 16.1 | สลับภาษา TH/EN | PASS | เจอ "Total Online Sales" / "Sales Records" |
| 16.2 | มือถือไม่ล้นแนวนอน | PASS | scrollWidth = 390 |

## 3) จุดดีที่ตรวจพบ
- `trust proxy` ตั้งถูก → lockout ผูกกับ **IP จริงของแต่ละคน** (คนหนึ่งกรอกผิดไม่ล็อกทุกคน)
- backend ไม่เปิดพอร์ตออกนอก (3001 ภายในเท่านั้น) · API key แนบฝั่งเซิร์ฟเวอร์ เบราว์เซอร์ไม่เห็น

## 4) ต้องตรวจด้วยตาเอง (อัตโนมัติไม่ครอบคลุม)
- [ ] ลากจัดลำดับช่องทาง แล้วรีเฟรช — ยังจำลำดับไหม
- [ ] ส่งออก CSV → เปิดใน Excel ภาษาไทยไม่เพี้ยน
- [ ] ตั้งค่า Admin (แบรนด์ / GMV / เป้า / เปลี่ยนลิงก์ชีต) — ไม่ได้ทดสอบเพื่อไม่แก้ค่าจริง
- [ ] AI (ถ้าเปิดใช้) · แถบเตือน stale (ต้องจำลองชีตล่ม)

## 5) ผลข้างเคียงจากการทดสอบ
- การทดสอบยิงแจ้งเตือนเข้า Discord จริง (login/เพิ่ม-ลบผู้ใช้/ล็อก) — ยืนยัน TC13.4 ทำงาน (ข้อความพวกนั้นคือของเทส ลบทิ้งได้)
- สร้าง user ทดสอบ `qa_viewer_tmp` แล้วลบทิ้งเรียบร้อย ไม่มี user ทดสอบค้าง
- IP เครื่องทดสอบถูกล็อก 60 วิจากเทส lockout แล้วปลดเอง

## ไฟล์ที่เกี่ยวข้อง
- สคริปต์เทส: `scratchpad/qa-run.mjs` (API), `scratchpad/qa-ui.mjs` (หน้าจอ)
- สกรีนช็อต: `scratchpad/qa-dashboard.png`, `qa-mainmenu.png`, `qa-mobile.png`
- เอกสารแผนทดสอบ (checklist): artifact https://claude.ai/code/artifact/5221bc37-fd0c-4ba1-b610-66d8e0a87c38

---
ระบบ: xBloom Sales Dashboard
