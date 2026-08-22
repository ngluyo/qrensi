/**
 * Rate limiter in-memory sederhana (anti brute-force ringan).
 * Catatan: pada serverless, memori per-instance (tidak global) — cukup sebagai
 * lapisan awal, bukan jaminan keras. Untuk keras, pakai Upstash/Redis (Fase 4+).
 */

interface Bucket {
  count: number;
  reset: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    // Pembersihan sesekali agar Map tak tumbuh tanpa batas.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : "") || req.headers.get("x-real-ip") || "unknown";
}
