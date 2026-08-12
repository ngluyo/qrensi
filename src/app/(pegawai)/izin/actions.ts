"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export interface IzinState {
  ok: boolean;
  message?: string;
}

const JENIS = ["sanggahan", "izin", "sakit", "cuti", "dinas_luar"];

export async function ajukanIzin(_prev: IzinState, formData: FormData): Promise<IzinState> {
  const user = await requireUser();
  if (!user.pegawaiId || !user.instansiId) return { ok: false, message: "Akun belum tertaut data pegawai." };

  const jenis = String(formData.get("jenis") || "");
  const tanggal = String(formData.get("tanggal") || "");
  const alasan = String(formData.get("alasan") || "").trim();
  if (!JENIS.includes(jenis) || !tanggal || !alasan) {
    return { ok: false, message: "Lengkapi jenis, tanggal, dan alasan." };
  }

  const db = createAdminClient();

  // Lampiran opsional.
  let lampiranPath: string | null = null;
  const file = formData.get("lampiran");
  if (file && file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Lampiran maksimal 5MB." };
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${user.pegawaiId}/${Date.now()}-${safeName}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await db.storage.from("sanggahan").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) return { ok: false, message: "Gagal unggah lampiran: " + upErr.message };
    lampiranPath = path;
  }

  const { error } = await db.from("sanggahan").insert({
    pegawai_id: user.pegawaiId,
    instansi_id: user.instansiId,
    jenis,
    tanggal,
    alasan,
    lampiran_path: lampiranPath,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/izin");
  return { ok: true };
}
