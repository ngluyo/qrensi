import type { NextConfig } from "next";

/**
 * Header keamanan mengikuti panduan resmi Next.js untuk PWA
 * (docs/RESEARCH.md §3). Service worker tidak boleh di-cache agar
 * pembaruan langsung diterima perangkat.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Kamera hanya untuk origin sendiri (enrollment & verifikasi wajah);
          // fitur sensitif lain dimatikan.
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
