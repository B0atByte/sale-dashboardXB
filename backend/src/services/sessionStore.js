/**
 * sessionStore.js — ที่เก็บ session แบบสลับ backend ได้ (memory / Redis)
 *
 * - ไม่ตั้ง REDIS_URL  → ใช้ in-memory Map (พฤติกรรมเดิม, เหมาะกับ replica เดียว)
 * - ตั้ง REDIS_URL     → ใช้ Redis (session แชร์ข้ามหลาย replica ได้จริง)
 *
 * ทุกเมธอดเป็น async เพื่อให้ผู้เรียกใช้เหมือนกันไม่ว่า backend ไหน
 * ค่าใน session: { username, role, access } — TTL คุมด้วย ttlMs
 * ioredis ถูก import แบบ dynamic เฉพาะเมื่อใช้ Redis (ไม่ตั้ง REDIS_URL ก็ไม่ต้องมี dep ตอนรัน)
 */

function memoryBackend() {
  const map = new Map(); // token -> { data, expiresAt }
  const idx = new Map(); // username(lower) -> Set<token>
  const addIdx = (u, t) => {
    const k = String(u || '').toLowerCase();
    if (!idx.has(k)) idx.set(k, new Set());
    idx.get(k).add(t);
  };
  const dropIdx = (u, t) => {
    const k = String(u || '').toLowerCase();
    const s = idx.get(k);
    if (s) {
      s.delete(t);
      if (s.size === 0) idx.delete(k);
    }
  };
  return {
    kind: 'memory',
    async set(token, data, ttlMs) {
      map.set(token, { data, expiresAt: Date.now() + ttlMs });
      addIdx(data.username, token);
    },
    async get(token) {
      const e = map.get(token);
      if (!e) return null;
      if (Date.now() > e.expiresAt) {
        map.delete(token);
        dropIdx(e.data.username, token);
        return null;
      }
      return e.data;
    },
    async del(token) {
      const e = map.get(token);
      map.delete(token);
      if (e) dropIdx(e.data.username, token);
    },
    async delByUser(username) {
      const k = String(username || '').toLowerCase();
      const s = idx.get(k);
      if (!s) return 0;
      let n = 0;
      for (const t of s) {
        map.delete(t);
        n += 1;
      }
      idx.delete(k);
      return n;
    },
  };
}

function redisBackend(client) {
  const sk = (t) => `sess:${t}`;
  const uk = (u) => `usess:${String(u || '').toLowerCase()}`;
  return {
    kind: 'redis',
    async set(token, data, ttlMs) {
      const pipe = client.multi();
      pipe.set(sk(token), JSON.stringify(data), 'PX', ttlMs);
      pipe.sadd(uk(data.username), token);
      pipe.pexpire(uk(data.username), ttlMs);
      await pipe.exec();
    },
    async get(token) {
      const raw = await client.get(sk(token));
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    async del(token) {
      const raw = await client.get(sk(token));
      const pipe = client.multi();
      pipe.del(sk(token));
      if (raw) {
        try {
          pipe.srem(uk(JSON.parse(raw).username), token);
        } catch {
          /* ข้าม */
        }
      }
      await pipe.exec();
    },
    async delByUser(username) {
      const tokens = await client.smembers(uk(username));
      if (!tokens.length) {
        await client.del(uk(username));
        return 0;
      }
      const pipe = client.multi();
      for (const t of tokens) pipe.del(sk(t));
      pipe.del(uk(username));
      await pipe.exec();
      return tokens.length;
    },
  };
}

let backendPromise = null;
function getBackend() {
  if (backendPromise) return backendPromise;
  backendPromise = (async () => {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.log('[session] backend = memory (ไม่ตั้ง REDIS_URL)');
      return memoryBackend();
    }
    try {
      const { default: Redis } = await import('ioredis');
      const client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });
      client.on('error', (e) => console.error(`[session] redis error: ${e.message}`));
      console.log('[session] backend = redis');
      return redisBackend(client);
    } catch (err) {
      console.error(`[session] เชื่อม Redis ไม่ได้ ใช้ memory แทน: ${err.message}`);
      return memoryBackend();
    }
  })();
  return backendPromise;
}

export async function sessionSet(token, data, ttlMs) {
  return (await getBackend()).set(token, data, ttlMs);
}
export async function sessionGet(token) {
  return (await getBackend()).get(token);
}
export async function sessionDel(token) {
  return (await getBackend()).del(token);
}
export async function sessionDelByUser(username) {
  return (await getBackend()).delByUser(username);
}
export async function sessionBackendKind() {
  return (await getBackend()).kind;
}
