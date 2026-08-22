"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assertCan } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";
import { terapkanIzinKePresensi } from "@/lib/terapkan-izin";
import { catatAudit } from "@/lib/audit";

export async function reviewSanggahan(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const keputusan = String(formData.get("keputusan"));
  const catatan = String(formData.get("catatan") || "").trim() || null;
  if (!id || !["disetujui", "ditolak"].includes(keputusan)) return;

  const db = createAdminClient();

  // Admin OPD hanya boleh meninjau pengajuan pegawai unitnya.
  const { data: s } = await db
    .from("sanggahan")
    .select("id, pegawai_id, jenis, tanggal, pegawai(unit_kerja_id)")
    .eq("id", id)
    .maybeSingle();
  if (!s) return;
  const unitKerjaId = (s.pegawai as unknown as { unit_kerja_id: string } | null)?.unit_kerja_id ?? null;
  assertCan(admin, "sanggahan.tinjau", { unitKerjaId });

  await db
    .from("sanggahan")
    .update({
      status: keputusan,
      catatan_admin: catatan,
      reviewed_by: admin.pegawaiId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Disetujui → terapkan ke presensi agar rekap akurat (MASTERPLAN 4.1).
  let dampak = { diubah: 0, dibuat: 0 };
  if (keputusan === "disetujui") {
    dampak = await terapkanIzinKePresensi(db, id);
  }

  await catatAudit(db, admin, `sanggahan.${keputusan}`, {
    tabel: "sanggahan",
    id,
    detail: { jenis: s.jenis, tanggal: s.tanggal, catatan, dampak },
  });

  revalidatePath("/admin/sanggahan");
  revalidatePath("/izin");
}
