import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Token QR milik KIOSK (blueprint §5.2 v2).
 * Format: base64url(payload) + "." + HMAC_SHA256(secret, base64url(payload))
 * Uniqueness dari nonce 128-bit -> tak perlu koordinasi antar-kiosk.
 *
 * CATATAN: modul ini SERVER-ONLY (memakai QR_SIGNING_SECRET). Jangan impor ke client.
 */

const TOKEN_TTL_MS = 2 * 60 * 1000; // 2 menit

export interface QrPayload {
  device_id: string; // id kiosk (perangkat_kiosk.id)
  sesi_id: string; // sesi_absensi_harian.id
  nonce: string; // hex 16 byte
  issued_at: number; // epoch ms
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function generateToken(
  args: { device_id: string; sesi_id: string },
  secret = process.env.QR_SIGNING_SECRET,
): { token_value: string; nonce: string; issued_at: number; expires_at: number } {
  if (!secret) throw new Error("QR_SIGNING_SECRET belum diset");
  const issued_at = Date.now();
  const nonce = randomBytes(16).toString("hex");
  const payload: QrPayload = { ...args, nonce, issued_at };
  const payloadB64 = b64url(JSON.stringify(payload));
  const token_value = `${payloadB64}.${sign(payloadB64, secret)}`;
  return { token_value, nonce, issued_at, expires_at: issued_at + TOKEN_TTL_MS };
}

/**
 * Verifikasi tanda tangan + kedaluwarsa. TIDAK mengecek status klaim di DB
 * (itu dilakukan lewat UPDATE atomik di endpoint verify).
 */
export function verifyToken(
  token_value: string,
  secret = process.env.QR_SIGNING_SECRET,
): { valid: boolean; payload?: QrPayload; reason?: string } {
  if (!secret) throw new Error("QR_SIGNING_SECRET belum diset");
  const parts = token_value.split(".");
  if (parts.length !== 2) return { valid: false, reason: "format" };
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return { valid: false, reason: "signature" };

  let payload: QrPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return { valid: false, reason: "payload" };
  }
  if (Date.now() > payload.issued_at + TOKEN_TTL_MS)
    return { valid: false, reason: "expired" };
  return { valid: true, payload };
}
