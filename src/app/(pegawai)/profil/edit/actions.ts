"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export interface ProfilState {
  ok: boolean;
  message?: string;
}

/**
 * Pegawai mengubah DATA PRIBADI-nya sendiri (no HP, email kontak, alamat).
 * Data kepegawaian (NIP/jabatan/unit/pola/status) TIDAK bisa diubah di sini —
 * itu kewenangan admin (docs/PERAN.md).
 */
export async function simpanDataPribadi(
  _prev: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const user = await requireUser("/profil/edit");
  if (!user.pegawaiId) return { ok: false, message: "Akun belum tertaut data pegawai." };

  const no_hp = String(formData.get("no_hp") || "").trim() || null;
  const email_kontak = String(formData.get("email_kontak") || "").trim() || null;
  const alamat = String(formData.get("alamat") || "").trim() || null;

  if (no_hp && !/^[0-9+\-\s()]{6,20}$/.test(no_hp)) {
    return { ok: false, message: "Nomor HP tidak valid." };
  }
  if (email_kontak && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email_kontak)) {
    return { ok: false, message: "Email kontak tidak valid." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("pegawai")
    .update({ no_hp, email_kontak, alamat })
    .eq("id", user.pegawaiId); // hanya baris miliknya sendiri
  if (error) return { ok: false, message: error.message };

  revalidatePath("/profil");
  revalidatePath("/profil/edit");
  return { ok: true, message: "Data pribadi tersimpan." };
}
