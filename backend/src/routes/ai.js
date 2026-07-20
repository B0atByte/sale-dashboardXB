/**
 * ai.js — เส้นทางฟีเจอร์ AI (ใช้ข้อมูลยอดขายเป็น context)
 *   GET  /api/ai/status   บอกว่าเปิดใช้ AI ไหม (frontend ใช้ตัดสินใจแสดง UI)
 *   GET  /api/insight     สรุปยอดขายด้วย AI (ตามตัวกรองปัจจุบัน) — มี cache กันเรียกซ้ำ
 *   POST /api/chat        ถาม-ตอบเกี่ยวกับยอดขาย (ใช้ข้อมูลทั้งหมดเป็น context)
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { getSalesData } from '../services/sheets.js';
import { chatCompletion, aiEnabled, AiError } from '../services/ai.js';

const router = Router();

function num2(n) {
  return Math.round(n * 100) / 100;
}

/** กรอง records ตาม query (เหมือนใน sales.js) */
function applyFilters(records, { from, to, platform }) {
  let out = records;
  if (from) out = out.filter((r) => r.date >= from);
  if (to) out = out.filter((r) => r.date <= to);
  if (platform) {
    const want = String(platform).trim().toLowerCase();
    out = out.filter((r) => r.platform.trim().toLowerCase() === want);
  }
  return out;
}

/** สร้าง "สรุปย่อ" ของข้อมูลไว้ป้อนให้ AI (กระชับ ไม่ส่ง record ดิบทั้งหมด) */
function buildDigest(records, { from, to, platform }) {
  let totalGmv = 0;
  let totalUnits = 0;
  let totalNet = 0;
  const orderNos = new Set();
  const plat = new Map();
  const prod = new Map();
  const day = new Map();

  for (const r of records) {
    totalGmv += r.lineTotal;
    totalUnits += r.quantity;
    totalNet += r.netRevenue;
    if (r.orderNo) orderNos.add(r.orderNo);

    const pk = r.platform.trim();
    const p = plat.get(pk) || { platform: pk, gmv: 0, orders: new Set() };
    p.gmv += r.lineTotal;
    if (r.orderNo) p.orders.add(r.orderNo);
    plat.set(pk, p);

    const pr = prod.get(r.productName) || { name: r.productName, units: 0, gmv: 0 };
    pr.units += r.quantity;
    pr.gmv += r.lineTotal;
    prod.set(r.productName, pr);

    if (r.date) day.set(r.date, (day.get(r.date) || 0) + r.lineTotal);
  }

  const orders = orderNos.size;
  return {
    period:
      from && to ? `${from} ถึง ${to}` : from ? `ตั้งแต่ ${from}` : to ? `ถึง ${to}` : 'ทั้งหมด',
    platformFilter: platform || 'ทุกช่องทาง',
    recordCount: records.length,
    totalGmv: num2(totalGmv),
    totalOrders: orders,
    totalUnits: num2(totalUnits),
    aov: orders ? num2(totalGmv / orders) : 0,
    totalNetRevenue: num2(totalNet),
    byPlatform: [...plat.values()]
      .map((p) => ({ platform: p.platform, gmv: num2(p.gmv), orders: p.orders.size }))
      .sort((a, b) => b.gmv - a.gmv),
    topProducts: [...prod.values()]
      .map((p) => ({ name: p.name, units: num2(p.units), gmv: num2(p.gmv) }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 8),
    dailyGmv: [...day.entries()]
      .map(([date, gmv]) => ({ date, gmv: num2(gmv) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

const SYS_INSIGHT = {
  th: 'คุณเป็นนักวิเคราะห์ยอดขายของแบรนด์ xBloom (เครื่องชงกาแฟและอุปกรณ์) วิเคราะห์ข้อมูล JSON ที่ให้ แล้วสรุปเป็นภาษาไทยแบบกระชับ เป็นกันเอง 3-4 ประเด็นสำคัญเป็น bullet (ขึ้นต้นด้วย •) ใช้ตัวเลขจริงประกอบ ชี้จุดเด่นและจุดที่ต้องระวัง ห้ามเกริ่นนำ ห้ามทวนโจทย์ ตอบเฉพาะ bullet',
  en: 'You are a sales analyst for xBloom (coffee machines & accessories). Analyze the JSON data and give a concise, friendly summary in English as 3-4 key bullet points (start each with •), using the real numbers, highlighting strengths and things to watch. No preamble, bullets only.',
};

const SYS_CHAT = {
  th: 'คุณเป็นผู้ช่วยวิเคราะห์ยอดขายของแบรนด์ xBloom ตอบคำถามโดยอ้างอิงจากข้อมูล JSON ที่ให้เท่านั้น ถ้าข้อมูลไม่พอให้บอกตรง ๆ ตอบภาษาไทยกระชับ ใช้ตัวเลขจริงประกอบ',
  en: 'You are a sales analyst assistant for xBloom. Answer using only the provided JSON data. If the data is insufficient, say so plainly. Answer concisely in English with real numbers.',
};

function langOf(req) {
  return req.query.lang === 'en' || req.body?.lang === 'en' ? 'en' : 'th';
}

// เปิดใช้ AI ไหม
router.get('/ai/status', (_req, res) => {
  res.json({ enabled: aiEnabled() });
});

// cache สรุป: key = hash(digest + lang) กันเรียก AI ซ้ำเมื่อข้อมูลเดิม
const insightCache = new Map();
const INSIGHT_TTL_MS = 10 * 60 * 1000;

router.get('/insight', async (req, res) => {
  try {
    const { records } = await getSalesData();
    const filtered = applyFilters(records, req.query);
    const digest = buildDigest(filtered, req.query);
    const lang = langOf(req);

    const key = crypto.createHash('sha1').update(JSON.stringify(digest) + lang).digest('hex');
    const cached = insightCache.get(key);
    if (cached && Date.now() - cached.at < INSIGHT_TTL_MS) {
      return res.json({ insight: cached.text, cached: true });
    }

    const text = await chatCompletion(
      [
        { role: 'system', content: SYS_INSIGHT[lang] },
        { role: 'user', content: `ข้อมูลยอดขาย (JSON):\n${JSON.stringify(digest)}` },
      ],
      { maxTokens: 400, temperature: 0.5 }
    );

    insightCache.set(key, { text, at: Date.now() });
    res.json({ insight: text, cached: false });
  } catch (err) {
    if (err instanceof AiError) return res.status(502).json({ error: 'ai_unavailable' });
    console.error('[ai] insight error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim().slice(0, 500);
    if (!question) return res.status(400).json({ error: 'empty_question' });

    // แชตใช้ข้อมูล "ทั้งหมด" เป็น context เพื่อตอบได้ทุกคำถาม
    const { records } = await getSalesData();
    const digest = buildDigest(records, {});
    const lang = langOf(req);

    const answer = await chatCompletion(
      [
        { role: 'system', content: SYS_CHAT[lang] },
        {
          role: 'user',
          content: `ข้อมูลยอดขายทั้งหมด (JSON):\n${JSON.stringify(digest)}\n\nคำถาม: ${question}`,
        },
      ],
      { maxTokens: 500, temperature: 0.4 }
    );

    res.json({ answer });
  } catch (err) {
    if (err instanceof AiError) return res.status(502).json({ error: 'ai_unavailable' });
    console.error('[ai] chat error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
