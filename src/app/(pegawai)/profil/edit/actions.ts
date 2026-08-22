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

/**
 * Unggah / ganti foto profil (data kosmetik — TERPISAH dari biometrik enrollment,
 * lihat migrasi 0010). File sudah dikecilkan di klien menjadi WebP ≤512px.
 */
export async function simpanFotoProfil(
  _prev: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const user = await requireUser("/profil/edit");
  if (!user.pegawaiId) return { ok: false, message: "Akun belum tertaut data pegawai." };

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pilih berkas foto dulu." };
  }
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Ukuran foto maksimal 2MB." };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Berkas harus berupa gambar." };

  const db = createAdminClient();

  // Hapus foto lama agar tidak menumpuk di storage.
  const { data: peg } = await db
    .from("pegawai")
    .select("foto_path")
    .eq("id", user.pegawaiId)
    .maybeSingle();
  if (peg?.foto_path) {
    await db.storage.from("avatar").remove([peg.foto_path as string]);
  }

  const ext = file.type === "image/webp" ? "webp" : file.type.split("/")[1] || "jpg";
  const path = `${user.pegawaiId}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from("avatar").upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });
  if (upErr) return { ok: false, message: "Gagal mengunggah: " + upErr.message };

  const { error } = await db.from("pegawai").update({ foto_path: path }).eq("id", user.pegawaiId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/profil");
  revalidatePath("/profil/edit");
  return { ok: true, message: "Foto profil diperbarui." };
}

/** Hapus foto profil (kembali ke inisial). */
export async function hapusFotoProfil(
  _prev: ProfilState,
  _formData: FormData,
): Promise<ProfilState> {
  const user = await requireUser("/profil/edit");
  if (!user.pegawaiId) return { ok: false, message: "Akun belum tertaut data pegawai." };

  const db = createAdminClient();
  const { data: peg } = await db
    .from("pegawai")
    .select("foto_path")
    .eq("id", user.pegawaiId)
    .maybeSingle();
  if (peg?.foto_path) await db.storage.from("avatar").remove([peg.foto_path as string]);
  await db.from("pegawai").update({ foto_path: null }).eq("id", user.pegawaiId);

  revalidatePath("/profil");
  revalidatePath("/profil/edit");
  return { ok: true, message: "Foto profil dihapus." };
}
