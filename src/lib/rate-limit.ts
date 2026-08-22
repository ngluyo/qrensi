import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter dua lapis (MASTERPLAN 6.1):
 *  - Bila env Upstash tersedia → memakai Redis (persisten & berlaku lintas
 *    instance serverless). Ini yang benar untuk produksi di Vercel.
 *  - Bila tidak → fallback in-memory per instance. Cukup untuk dev/pilot kecil,
 *    tetapi TIDAK menjamin batas global.
 *
 * Semua fungsi async agar pemanggil tidak perlu tahu lapis mana yang dipakai.
 */

const punyaUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = punyaUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/** Cache limiter per konfigurasi agar tidak dibuat berulang. */
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${limit}:${windowMs}`;
  let l = limiters.get(key);
  if (!l) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix: "qrensi",
      analytics: false,
    });
    limiters.set(key, l);
  }
  return l;
}

// ---- Fallback in-memory ----
interface Bucket {
  count: number;
  reset: number;
}
const buckets = new Map<string, Bucket>();

function rateLimitMemori(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/** Periksa & konsumsi kuota untuk `key`. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) return rateLimitMemori(key, limit, windowMs);

  try {
    const r = await limiter.limit(key);
    return {
      ok: r.success,
      retryAfter: r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
    };
  } catch {
    // Redis bermasalah → jangan kunci pengguna, pakai fallback lokal.
    return rateLimitMemori(key, limit, windowMs);
  }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : "") || req.headers.get("x-real-ip") || "unknown";
}

/** Untuk panel diagnostik: apakah rate limit sudah persisten? */
export function rateLimitPersisten(): boolean {
  return punyaUpstash;
}
