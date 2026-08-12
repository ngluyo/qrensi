"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function reviewSanggahan(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const keputusan = String(formData.get("keputusan"));
  const catatan = String(formData.get("catatan") || "").trim() || null;
  if (!id || !["disetujui", "ditolak"].includes(keputusan)) return;

  const db = createAdminClient();
  await db
    .from("sanggahan")
    .update({
      status: keputusan,
      catatan_admin: catatan,
      reviewed_by: admin.pegawaiId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/sanggahan");
}
