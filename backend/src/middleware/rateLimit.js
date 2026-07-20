/**
 * rateLimit.js — จำกัดจำนวน request ต่อ IP (กัน flood / DoS)
 * ใช้ req.ip ซึ่งได้ค่า IP จริงจาก X-Forwarded-For (ตั้ง trust proxy ไว้ที่ server.js)
 */
import rateLimit from 'express-rate-limit';

/**
 * จำกัดทั้งระบบ: 300 request/นาที ต่อ IP
 * (ใช้งานปกติ auto-refresh ~6/นาที/แท็บ — 300 รองรับผู้ใช้ร่วม IP เดียวกันได้หลายคน
 * แต่บล็อกการยิงถล่มเป็นพัน ๆ ครั้ง)
 */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});

/**
 * จำกัดเข้มสำหรับ ?fresh=1 (ข้ามแคช ยิงตรงไป Google Sheets): 15 ครั้ง/นาที ต่อ IP
 * นับเฉพาะ request ที่ขอข้อมูลสดเท่านั้น (request ปกติที่ใช้แคชไม่ถูกนับ)
 * — คนกดปุ่มรีเฟรชด้วยมือไม่มีทางเกิน แต่สคริปต์ที่ยิงถล่มจะโดนบล็อก
 */
export const freshLimiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited_fresh' },
  skip: (req) => !(req.query.fresh === '1' || req.query.fresh === 'true'),
});

/**
 * จำกัดการเรียก AI: 20 ครั้ง/นาที ต่อ IP (เพราะเรียก AI มีค่าใช้จ่ายต่อครั้ง)
 */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited_ai' },
});
