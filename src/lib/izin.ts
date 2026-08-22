import { redirect } from "next/navigation";
import type { SesiUser } from "@/lib/auth";

/**
 * Lapisan izin terpusat (lihat docs/PERAN.md).
 * Super Admin ⊇ Admin OPD ⊇ Pegawai.
 *
 * Dipakai di: navigasi (sembunyikan), halaman (assertCan), server action (WAJIB
 * assertCan sebelum menulis), dan query (scopeUnits untuk memfilter data).
 */

export type Kemampuan =
  // pegawai
  | "pegawai.lihat"
  | "pegawai.tambah"
  | "pegawai.edit"
  | "pegawai.hapus"
  | "pegawai.pindah_unit"
  // akun
  | "akun.buat"
  | "akun.reset_password"
  // biometrik
  | "wajah.enroll"
  | "wajah.hapus"
  // konfigurasi (super admin saja)
  | "konfig.jam_kerja"
  | "konfig.potongan"
  | "konfig.unit_kerja"
  | "konfig.instansi"
  // peran
  | "peran.kelola"
  // kiosk
  | "kiosk.kelola"
  // izin/sanggahan
  | "sanggahan.tinjau"
  // laporan
  | "laporan.lihat"
  | "laporan.ekspor"
  | "audit.lihat";

/** Kemampuan yang HANYA boleh super admin. */
const KHUSUS_SUPER: ReadonlySet<Kemampuan> = new Set<Kemampuan>([
  "pegawai.pindah_unit",
  "konfig.jam_kerja",
  "konfig.potongan",
  "konfig.unit_kerja",
  "konfig.instansi",
  "peran.kelola",
  "laporan.ekspor",
]);

export interface Konteks {
  /** Unit kerja objek yang disentuh; wajib untuk kemampuan ber-lingkup. */
  unitKerjaId?: string | null;
}

/** Apakah user boleh melakukan `aksi` (opsional pada unit tertentu)? */
export function can(user: SesiUser | null, aksi: Kemampuan, ctx: Konteks = {}): boolean {
  if (!user || !user.peran) return false;
  if (user.peran === "super_admin") return true;
  if (KHUSUS_SUPER.has(aksi)) return false;

  // admin_unit: hanya untuk unit yang diampu.
  if (ctx.unitKerjaId === undefined) return true; // aksi umum (mis. buka daftar)
  if (!ctx.unitKerjaId) return false;
  return user.unitKerjaIds.includes(ctx.unitKerjaId);
}

/** Seperti `can`, tetapi mengalihkan bila tidak berwenang. WAJIB dipakai di server action. */
export function assertCan(user: SesiUser | null, aksi: Kemampuan, ctx: Konteks = {}): void {
  if (!can(user, aksi, ctx)) redirect("/admin?error=tidak_berwenang");
}

/**
 * Lingkup unit untuk memfilter query.
 * `null` = semua unit (super admin). Array = daftar unit yang diampu.
 */
export function scopeUnits(user: SesiUser | null): string[] | null {
  if (!user?.peran) return [];
  return user.peran === "super_admin" ? null : user.unitKerjaIds;
}

/** Label peran untuk UI. */
export function labelPeran(user: SesiUser | null): string {
  if (!user?.peran) return "Pegawai";
  return user.peran === "super_admin" ? "Super Admin" : "Admin OPD";
}
