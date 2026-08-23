import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Identitas aplikasi (white-label). Dibaca dari tabel `pengaturan_aplikasi`
 * sehingga sumber kode yang sama bisa dipakai instansi/organisasi mana pun
 * tanpa mengubah kode. Nilai default dipakai bila tabel belum ada/terisi,
 * agar aplikasi tetap jalan sebelum migrasi dijalankan.
 */
export interface Pengaturan {
  namaAplikasi: string;
  tagline: string;
  namaOrganisasi: string;
  singkatan: string;
  warnaBrand: string;
  logoPath: string | null;
  timezone: string;
  kontakBantuan: string | null;
}

export const PENGATURAN_DEFAULT: Pengaturan = {
  namaAplikasi: "QRensi",
  tagline: "Presensi berbasis QR & verifikasi wajah",
  namaOrganisasi: "Organisasi Anda",
  singkatan: "QR",
  warnaBrand: "#155e9c",
  logoPath: null,
  timezone: "Asia/Makassar",
  kontakBantuan: null,
};

/** Dibungkus `cache` → satu query per request meski dipanggil banyak komponen. */
export const getPengaturan = cache(async (): Promise<Pengaturan> => {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("pengaturan_aplikasi")
      .select("nama_aplikasi, tagline, nama_organisasi, singkatan, warna_brand, logo_path, timezone, kontak_bantuan")
      .eq("id", true)
      .maybeSingle();
    if (error || !data) return PENGATURAN_DEFAULT;

    return {
      namaAplikasi: (data.nama_aplikasi as string) || PENGATURAN_DEFAULT.namaAplikasi,
      tagline: (data.tagline as string) || PENGATURAN_DEFAULT.tagline,
      namaOrganisasi: (data.nama_organisasi as string) || PENGATURAN_DEFAULT.namaOrganisasi,
      singkatan: (data.singkatan as string) || PENGATURAN_DEFAULT.singkatan,
      warnaBrand: (data.warna_brand as string) || PENGATURAN_DEFAULT.warnaBrand,
      logoPath: (data.logo_path as string) ?? null,
      timezone: (data.timezone as string) || PENGATURAN_DEFAULT.timezone,
      kontakBantuan: (data.kontak_bantuan as string) ?? null,
    };
  } catch {
    return PENGATURAN_DEFAULT;
  }
});

/** URL logo bertanda tangan (bucket privat). null bila belum ada logo. */
export async function getLogoUrl(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null;
  try {
    const db = createAdminClient();
    const { data } = await db.storage.from("branding").createSignedUrl(logoPath, 60 * 60);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
