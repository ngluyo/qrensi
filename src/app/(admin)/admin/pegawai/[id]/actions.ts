"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assertCan } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";

export interface DetailState {
  ok: boolean;
  message?: string;
  email?: string;
  password?: string;
}

/** Ambil unit_kerja_id pegawai (untuk pengecekan lingkup admin OPD). */
async function unitDari(pegawaiId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from("pegawai").select("unit_kerja_id").eq("id", pegawaiId).maybeSingle();
  return (data?.unit_kerja_id as string) ?? null;
}

export async function simpanProfilPegawai(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, message: "ID pegawai kosong." };

  const unitLama = await unitDari(id);
  assertCan(user, "pegawai.edit", { unitKerjaId: unitLama });

  const nama = String(formData.get("nama") || "").trim();
  const nip = String(formData.get("nip") || "").trim() || null;
  const jabatan = String(formData.get("jabatan") || "").trim() || null;
  const unitBaru = String(formData.get("unit_kerja_id") || "");
  const pola = String(formData.get("pola_hari_kerja_id") || "");
  const status = String(formData.get("status_kepegawaian") || "aktif");
  if (!nama || !unitBaru || !pola) return { ok: false, message: "Nama, unit, dan pola wajib diisi." };

  // Memindahkan pegawai ke unit lain = kewenangan super admin.
  if (unitBaru !== unitLama) assertCan(user, "pegawai.pindah_unit", {});

  const db = createAdminClient();
  const { error } = await db
    .from("pegawai")
    .update({ nama, nip, jabatan, unit_kerja_id: unitBaru, pola_hari_kerja_id: pola, status_kepegawaian: status })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/pegawai/${id}`);
  revalidatePath("/admin/pegawai");
  return { ok: true, message: "Profil tersimpan." };
}

export async function buatAkunDetail(_prev: DetailState, formData: FormData): Promise<DetailState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const unit = await unitDari(id);
  assertCan(user, "akun.buat", { unitKerjaId: unit });

  const db = createAdminClient();
  const { data: peg } = await db.from("pegawai").select("nip, auth_user_id").eq("id", id).maybeSingle();
  if (!peg) return { ok: false, message: "Pegawai tidak ditemukan." };
  if (peg.auth_user_id) return { ok: false, message: "Pegawai ini sudah punya akun." };

  let email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) {
    if (!peg.nip) return { ok: false, message: "Isi email, atau lengkapi NIP lebih dulu." };
    email = `${String(peg.nip).toLowerCase().replace(/\s+/g, "")}@qrensi.local`;
  }

  const password = "Qrensi!" + randomBytes(4).toString("hex");
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });
  if (error) return { ok: false, message: error.message };

  await db.from("pegawai").update({ auth_user_id: created.user.id }).eq("id", id);
  revalidatePath(`/admin/pegawai/${id}`);
  return { ok: true, email, password };
}

export async function resetPasswordDetail(_prev: DetailState, formData: FormData): Promise<DetailState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const unit = await unitDari(id);
  assertCan(user, "akun.reset_password", { unitKerjaId: unit });

  const db = createAdminClient();
  const { data: peg } = await db.from("pegawai").select("auth_user_id").eq("id", id).maybeSingle();
  if (!peg?.auth_user_id) return { ok: false, message: "Pegawai ini belum punya akun." };

  const password = "Qrensi!" + randomBytes(4).toString("hex");
  const { data: updated, error } = await db.auth.admin.updateUserById(peg.auth_user_id, {
    password,
    user_metadata: { must_change_password: true },
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/pegawai/${id}`);
  return { ok: true, email: updated.user.email ?? "", password };
}

export async function hapusEnrollment(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const unit = await unitDari(id);
  assertCan(user, "wajah.hapus", { unitKerjaId: unit });

  const db = createAdminClient();
  await db.from("pegawai_face_enrollment").delete().eq("pegawai_id", id);
  revalidatePath(`/admin/pegawai/${id}`);
}

export async function hapusPegawai(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const unit = await unitDari(id);
  assertCan(user, "pegawai.hapus", { unitKerjaId: unit });

  const db = createAdminClient();
  await db.from("pegawai").delete().eq("id", id);
  revalidatePath("/admin/pegawai");
}
