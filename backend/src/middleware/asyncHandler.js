/**
 * asyncHandler.js — ห่อ async route handler ให้ error ที่ reject ถูกส่งต่อไป error middleware
 * Express 4 ไม่ forward promise rejection จาก async handler อัตโนมัติ — ถ้าไม่ห่อ
 * error (เช่น fs เขียนไม่ได้) จะทำให้ request "ค้าง" จน socket timeout แทนที่จะได้ 500
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
