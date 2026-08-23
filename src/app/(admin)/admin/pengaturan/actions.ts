"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assertCan } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";
import { catatAudit } from "@/lib/audit";

export interface PengaturanState {
  ok: boolean;
  message?: string;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function simpanPengaturan(
  _prev: PengaturanState,
  formData: FormData,
): Promise<PengaturanState> {
  const user = await requireAdmin();
  assertCan(user, "konfig.instansi");

  const nama_aplikasi = String(formData.get("nama_aplikasi") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const nama_organisasi = String(formData.get("nama_organisasi") || "").trim();
  const singkatan = String(formData.get("singkatan") || "").trim().slice(0, 4);
  const warna_brand = String(formData.get("warna_brand") || "").trim();
  const timezone = String(formData.get("timezone") || "Asia/Makassar").trim();
  const kontak_bantuan = String(formData.get("kontak_bantuan") || "").trim() || null;

  if (!nama_aplikasi) return { ok: false, message: "Nama aplikasi wajib diisi." };
  if (!nama_organisasi) return { ok: false, message: "Nama organisasi wajib diisi." };
  if (!HEX.test(warna_brand)) return { ok: false, message: "Warna brand harus format hex, mis. #155e9c." };

  const db = createAdminClient();
  const { error } = await db
    .from("pengaturan_aplikasi")
    .update({
      nama_aplikasi,
      tagline,
      nama_organisasi,
      singkatan: singkatan || nama_aplikasi.slice(0, 2).toUpperCase(),
      warna_brand,
      timezone,
      kontak_bantuan,
      updated_at: new Date().toISOString(),
      updated_by: user.authUserId,
    })
    .eq("id", true);
  if (error) return { ok: false, message: error.message };

  // Selaraskan timezone instansi agar perhitungan presensi konsisten.
  await db.from("instansi").update({ timezone }).eq("id", user.instansiId);

  await catatAudit(db, user, "pengaturan.ubah", {
    tabel: "pengaturan_aplikasi",
    detail: { nama_aplikasi, nama_organisasi, warna_brand, timezone },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan tersimpan." };
}

export async function simpanLogo(
  _prev: PengaturanState,
  formData: FormData,
): Promise<PengaturanState> {
  const user = await requireAdmin();
  assertCan(user, "konfig.instansi");

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih berkas logo." };
  if (file.size > 1024 * 1024) return { ok: false, message: "Ukuran logo maksimal 1MB." };
  if (!file.type.startsWith("image/")) return { ok: false, message: "Berkas harus berupa gambar." };

  const db = createAdminClient();
  const { data: lama } = await db
    .from("pengaturan_aplikasi")
    .select("logo_path")
    .eq("id", true)
    .maybeSingle();
  if (lama?.logo_path) await db.storage.from("branding").remove([lama.logo_path as string]);

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1] || "png";
  const path = `logo-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from("branding").upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });
  if (upErr) return { ok: false, message: "Gagal mengunggah: " + upErr.message };

  await db.from("pengaturan_aplikasi").update({ logo_path: path }).eq("id", true);
  await catatAudit(db, user, "pengaturan.logo", { tabel: "pengaturan_aplikasi" });

  revalidatePath("/", "layout");
  return { ok: true, message: "Logo diperbarui." };
}

export async function hapusLogo(
  _prev: PengaturanState,
  _formData: FormData,
): Promise<PengaturanState> {
  const user = await requireAdmin();
  assertCan(user, "konfig.instansi");

  const db = createAdminClient();
  const { data } = await db.from("pengaturan_aplikasi").select("logo_path").eq("id", true).maybeSingle();
  if (data?.logo_path) await db.storage.from("branding").remove([data.logo_path as string]);
  await db.from("pengaturan_aplikasi").update({ logo_path: null }).eq("id", true);

  revalidatePath("/", "layout");
  return { ok: true, message: "Logo dihapus." };
}
