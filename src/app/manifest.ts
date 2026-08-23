import type { MetadataRoute } from "next";
import { getPengaturan } from "@/lib/pengaturan";

/**
 * Manifest PWA dinamis — nama & warna mengikuti pengaturan white-label,
 * sehingga aplikasi yang dipasang di layar utama memakai identitas organisasi
 * masing-masing. Menggantikan public/manifest.json yang statis.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const p = await getPengaturan();

  return {
    name: `${p.namaAplikasi} — ${p.namaOrganisasi}`,
    short_name: p.namaAplikasi,
    description: p.tagline,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F172A",
    theme_color: p.warnaBrand,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
