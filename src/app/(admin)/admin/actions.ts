"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// ---------- Pola Hari Kerja ----------

export async function createPola(formData: FormData) {
  const user = await requireAdmin();
  const nama = String(formData.get("nama") || "").trim();
  const hari = formData.getAll("hari").map((h) => Number(h)).filter((n) => n >= 1 && n <= 7);
  if (!nama || hari.length === 0) return;

  const db = createAdminClient();
  await db.from("pola_hari_kerja").insert({
    instansi_id: user.instansiId,
    nama,
    hari_aktif: hari.sort((a, b) => a - b),
  });
  revalidatePath("/admin/pola-hari-kerja");
}

export async function updatePola(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const nama = String(formData.get("nama") || "").trim();
  const hari = formData.getAll("hari").map((h) => Number(h)).filter((n) => n >= 1 && n <= 7);
  if (!id || !nama || hari.length === 0) return;

  const db = createAdminClient();
  await db
    .from("pola_hari_kerja")
    .update({ nama, hari_aktif: hari.sort((a, b) => a - b) })
    .eq("id", id);
  revalidatePath("/admin/pola-hari-kerja");
}

export async function deletePola(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  await db.from("pola_hari_kerja").delete().eq("id", id);
  revalidatePath("/admin/pola-hari-kerja");
}

// ---------- Jam Kerja Sesi ----------

const JAM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function timeOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v || "").trim();
  return JAM_RE.test(s) ? s : null;
}

export async function updateJamSesi(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const jam_buka = timeOrNull(formData.get("jam_buka"));
  const jam_tutup = timeOrNull(formData.get("jam_tutup"));
  if (!id || !jam_buka || !jam_tutup) return;

  const patch: Record<string, unknown> = {
    jam_buka,
    jam_tutup,
    jam_batas_akhir: timeOrNull(formData.get("jam_batas_akhir")),
    jam_wajar_akhir: timeOrNull(formData.get("jam_wajar_akhir")),
    aktif: formData.get("aktif") === "on",
  };

  const db = createAdminClient();
  await db.from("jam_kerja_sesi").update(patch).eq("id", id);
  revalidatePath("/admin/jam-kerja");
}
