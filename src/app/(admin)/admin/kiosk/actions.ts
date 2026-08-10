"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateDeviceSecret, hashDeviceSecret } from "@/lib/kiosk-auth";

export interface KioskActionState {
  ok: boolean;
  message?: string;
  namaPerangkat?: string;
  secret?: string; // ditampilkan SEKALI
}

export async function registerKiosk(
  _prev: KioskActionState,
  formData: FormData,
): Promise<KioskActionState> {
  const user = await requireAdmin();
  const nama = String(formData.get("nama_perangkat") || "").trim();
  const unit_kerja_id = String(formData.get("unit_kerja_id") || "") || null;
  const lat = parseFloat(String(formData.get("latitude") || ""));
  const lng = parseFloat(String(formData.get("longitude") || ""));
  if (!nama || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, message: "Nama & koordinat (lat/long) wajib diisi." };
  }

  const secret = generateDeviceSecret();
  const db = createAdminClient();
  const { error } = await db.from("perangkat_kiosk").insert({
    instansi_id: user.instansiId,
    unit_kerja_id,
    nama_perangkat: nama,
    device_secret_hash: hashDeviceSecret(secret),
    latitude: lat,
    longitude: lng,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/kiosk");
  return { ok: true, namaPerangkat: nama, secret };
}

export async function resetKioskSecret(
  _prev: KioskActionState,
  formData: FormData,
): Promise<KioskActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (!id) return { ok: false, message: "ID kiosk kosong." };
  const secret = generateDeviceSecret();
  const db = createAdminClient();
  const { data, error } = await db
    .from("perangkat_kiosk")
    .update({ device_secret_hash: hashDeviceSecret(secret) })
    .eq("id", id)
    .select("nama_perangkat")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/kiosk");
  return { ok: true, namaPerangkat: data?.nama_perangkat, secret };
}

export async function setKioskAktif(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const aktif = formData.get("aktif") === "true";
  const db = createAdminClient();
  await db.from("perangkat_kiosk").update({ aktif }).eq("id", id);
  revalidatePath("/admin/kiosk");
}

export async function deleteKiosk(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  await db.from("perangkat_kiosk").delete().eq("id", id);
  revalidatePath("/admin/kiosk");
}
