/**
 * apiKey.js — middleware ตรวจสอบ header x-api-key ด้วยการเปรียบเทียบแบบ timing-safe
 * เพื่อป้องกัน timing attack เมื่อ key ไม่ตรงหรือไม่ได้ส่งมา จะตอบ 401
 */
import crypto from 'node:crypto';
import config from '../config.js';

/**
 * เปรียบเทียบสตริงสองตัวแบบ timing-safe
 * ใช้ SHA-256 digest ของทั้งสองฝั่งก่อน เพื่อให้ buffer ยาวเท่ากันเสมอ
 * (crypto.timingSafeEqual จะ throw ถ้าความยาวไม่เท่ากัน ซึ่งจะรั่วข้อมูลความยาว key)
 */
function safeEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

export default function apiKeyAuth(req, res, next) {
  const provided = req.get('x-api-key');
  if (!provided || !safeEqual(provided, config.apiKey)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
