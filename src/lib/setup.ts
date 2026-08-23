import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Deteksi instalasi baru: bila BELUM ADA satu pun Super Admin, aplikasi masuk
 * "mode setup" — halaman /setup dibuka agar pengadopsi baru bisa membuat admin
 * pertama lewat browser, tanpa perlu terminal.
 *
 * Aman: begitu satu Super Admin ada, /setup otomatis tertutup selamanya
 * (tidak bisa dipakai untuk membuat admin liar).
 */
export const butuhSetup = cache(async (): Promise<boolean> => {
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from("admin_unit_kerja")
      .select("id", { count: "exact", head: true })
      .eq("peran", "super_admin");
    if (error) return false; // skema belum ada → jangan alihkan, tampilkan galat asli
    return (count ?? 0) === 0;
  } catch {
    return false;
  }
});
