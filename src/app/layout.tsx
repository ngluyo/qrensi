import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { getPengaturan } from "@/lib/pengaturan";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Judul & deskripsi mengikuti pengaturan white-label. */
export async function generateMetadata(): Promise<Metadata> {
  const p = await getPengaturan();
  return {
    title: `${p.namaAplikasi} — ${p.namaOrganisasi}`,
    description: p.tagline,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: p.namaAplikasi },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const p = await getPengaturan();
  return {
    themeColor: p.warnaBrand,
    viewportFit: "cover",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const p = await getPengaturan();

  return (
    <html lang="id" className={`${jakarta.variable} h-full`}>
      <head>
        {/*
          Warna brand dari pengaturan menimpa token bawaan (white-label).
          Selektor `html:root` sengaja lebih spesifik daripada `:root` di
          globals.css (termasuk blok dark mode) agar override selalu menang,
          apa pun urutan pemuatan CSS.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html:root{--brand:${p.warnaBrand};--brand-strong:${p.warnaBrand};}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
