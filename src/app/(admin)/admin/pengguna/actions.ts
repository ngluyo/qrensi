"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assertCan } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";

export interface PenggunaState {
  ok: boolean;
  message?: string;
}

/** Tunjuk pegawai sebagai Admin OPD (untuk 1 unit) atau Super Admin. */
export async function tunjukAdmin(
  _prev: PenggunaState,
  formData: FormData,
): Promise<PenggunaState> {
  const user = await requireAdmin();
  assertCan(user, "peran.kelola");

  const pegawaiId = String(formData.get("pegawai_id") || "");
  const peran = String(formData.get("peran") || "admin_unit");
  const unitKerjaId = String(formData.get("unit_kerja_id") || "");
  if (!pegawaiId) return { ok: false, message: "Pilih pegawai." };
  if (!["admin_unit", "super_admin"].includes(peran)) return { ok: false, message: "Peran tidak valid." };

  const db = createAdminClient();
  const { data: peg } = await db
    .from("pegawai")
    .select("auth_user_id, unit_kerja_id, nama")
    .eq("id", pegawaiId)
    .maybeSingle();
  if (!peg) return { ok: false, message: "Pegawai tidak ditemukan." };
  if (!peg.auth_user_id) {
    return { ok: false, message: `${peg.nama} belum punya akun login. Buat akunnya dulu.` };
  }

  // Admin OPD wajib punya unit; super admin memakai unit asalnya sebagai "unit rumah".
  const unit = peran === "admin_unit" ? unitKerjaId || (peg.unit_kerja_id as string) : (peg.unit_kerja_id as string);
  if (!unit) return { ok: false, message: "Unit kerja wajib dipilih." };

  const { error } = await db
    .from("admin_unit_kerja")
    .upsert(
      { auth_user_id: peg.auth_user_id, unit_kerja_id: unit, peran },
      { onConflict: "auth_user_id,unit_kerja_id" },
    );
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/pengguna");
  return { ok: true, message: `${peg.nama} ditetapkan sebagai ${peran === "super_admin" ? "Super Admin" : "Admin OPD"}.` };
}

/** Cabut satu penugasan admin. */
export async function cabutAdmin(formData: FormData) {
  const user = await requireAdmin();
  assertCan(user, "peran.kelola");

  const id = String(formData.get("id") || "");
  if (!id) return;

  const db = createAdminClient();
  // Jangan biarkan super admin terakhir tercabut (mengunci sistem).
  const { data: baris } = await db
    .from("admin_unit_kerja")
    .select("peran, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (baris?.peran === "super_admin") {
    const { count } = await db
      .from("admin_unit_kerja")
      .select("id", { count: "exact", head: true })
      .eq("peran", "super_admin");
    if ((count ?? 0) <= 1) return; // tolak diam-diam: harus selalu ada 1 super admin
  }

  await db.from("admin_unit_kerja").delete().eq("id", id);
  revalidatePath("/admin/pengguna");
}
