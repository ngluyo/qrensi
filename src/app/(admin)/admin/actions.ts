"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assertCan } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";

// ---------- Pola Hari Kerja ----------

export async function createPola(formData: FormData) {
  const user = await requireAdmin();
  assertCan(user, "konfig.jam_kerja");
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
  assertCan(await requireAdmin(), "konfig.jam_kerja");
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
  assertCan(await requireAdmin(), "konfig.jam_kerja");
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
  assertCan(await requireAdmin(), "konfig.jam_kerja");
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

// ---------- Unit Kerja ----------

export async function createUnit(formData: FormData) {
  const user = await requireAdmin();
  assertCan(user, "konfig.unit_kerja");
  const nama = String(formData.get("nama") || "").trim();
  if (!nama) return;
  const db = createAdminClient();
  await db.from("unit_kerja").insert({ instansi_id: user.instansiId, nama });
  revalidatePath("/admin/pegawai");
}

// ---------- Pegawai ----------

export async function createPegawai(formData: FormData) {
  const user = await requireAdmin();
  const nama = String(formData.get("nama") || "").trim();
  const nip = String(formData.get("nip") || "").trim() || null;
  const jabatan = String(formData.get("jabatan") || "").trim() || null;
  const unit_kerja_id = String(formData.get("unit_kerja_id") || "");
  const pola_hari_kerja_id = String(formData.get("pola_hari_kerja_id") || "");
  if (!nama || !unit_kerja_id || !pola_hari_kerja_id) return;
  // Admin OPD hanya boleh menambah pegawai di unit yang diampu.
  assertCan(user, "pegawai.tambah", { unitKerjaId: unit_kerja_id });

  const db = createAdminClient();
  await db.from("pegawai").insert({
    instansi_id: user.instansiId,
    unit_kerja_id,
    pola_hari_kerja_id,
    nama,
    nip,
    jabatan,
  });
  revalidatePath("/admin/pegawai");
}

// ---------- Pengaturan Potongan ----------

export async function createPotongan(formData: FormData) {
  const user = await requireAdmin();
  assertCan(user, "konfig.potongan");
  const jenis = String(formData.get("jenis") || "");
  const menit_dari = parseInt(String(formData.get("menit_dari") || "0"), 10);
  const sampaiRaw = String(formData.get("menit_sampai") || "").trim();
  const menit_sampai = sampaiRaw === "" ? null : parseInt(sampaiRaw, 10);
  const persen = parseFloat(String(formData.get("persen_potongan") || ""));
  if (!["terlambat", "pulang_cepat", "tidak_hadir"].includes(jenis) || Number.isNaN(persen)) return;

  const db = createAdminClient();
  await db.from("pengaturan_potongan").insert({
    instansi_id: user.instansiId,
    jenis,
    menit_dari: Number.isNaN(menit_dari) ? 0 : menit_dari,
    menit_sampai,
    persen_potongan: persen,
  });
  revalidatePath("/admin/potongan");
}

export async function deletePotongan(formData: FormData) {
  assertCan(await requireAdmin(), "konfig.potongan");
  const id = String(formData.get("id"));
  const db = createAdminClient();
  await db.from("pengaturan_potongan").delete().eq("id", id);
  revalidatePath("/admin/potongan");
}
