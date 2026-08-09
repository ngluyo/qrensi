import { randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * Device binding kiosk (blueprint §6.4 v2). Server hanya menyimpan HASH secret.
 * SERVER-ONLY.
 */

export function generateDeviceSecret(): string {
  return randomBytes(32).toString("base64url"); // ~43 char
}

export function hashDeviceSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifyDeviceSecret(secret: string, hash: string): boolean {
  const a = Buffer.from(hashDeviceSecret(secret));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
