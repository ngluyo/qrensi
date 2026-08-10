import { createHmac, timingSafeEqual } from "crypto";

/**
 * face_session_token (blueprint §6.2): bukti server bahwa pegawai X baru saja
 * lolos verifikasi wajah. Ditandatangani server, umur pendek (~90 detik).
 * SERVER-ONLY.
 */

const TTL_MS = 90 * 1000;

function secret(): string {
  const s = process.env.QR_SIGNING_SECRET;
  if (!s) throw new Error("QR_SIGNING_SECRET belum diset");
  return "face:" + s; // namespace agar beda dari token QR
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function signFaceToken(pegawaiId: string): { token: string; expires_at: number } {
  const issued_at = Date.now();
  const payload = { pid: pegawaiId, iat: issued_at };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${payloadB64}.${sign(payloadB64)}`, expires_at: issued_at + TTL_MS };
}

export function verifyFaceToken(
  token: string,
): { valid: boolean; pegawaiId?: string; reason?: string } {
  if (!token) return { valid: false, reason: "kosong" };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "format" };
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: "signature" };
  let payload: { pid: string; iat: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return { valid: false, reason: "payload" };
  }
  if (Date.now() > payload.iat + TTL_MS) return { valid: false, reason: "expired" };
  return { valid: true, pegawaiId: payload.pid };
}
