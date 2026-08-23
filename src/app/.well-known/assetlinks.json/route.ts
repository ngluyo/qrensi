import { NextResponse } from "next/server";

/**
 * Digital Asset Links — menghubungkan APK (TWA) dengan domain ini agar Android
 * membuka aplikasi TANPA address bar browser.
 *
 * Isi `TWA_SHA256_FINGERPRINT` dengan sidik jari SHA-256 dari keystore
 * penandatangan APK (lihat docs/ANDROID_APK.md). Boleh lebih dari satu,
 * dipisah koma — berguna saat memakai Play App Signing (kunci unggah + kunci
 * penandatanganan Play).
 *
 * Selama env belum diisi, endpoint mengembalikan array kosong (valid secara
 * format) sehingga tidak memecah apa pun.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const paket = process.env.TWA_PACKAGE_NAME || "id.qrensi.twa";
  const sidikJari = (process.env.TWA_SHA256_FINGERPRINT || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const isi =
    sidikJari.length === 0
      ? []
      : [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: paket,
              sha256_cert_fingerprints: sidikJari,
            },
          },
        ];

  return NextResponse.json(isi, {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
}
