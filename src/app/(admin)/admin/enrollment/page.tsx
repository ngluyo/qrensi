import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { EnrollmentClient } from "./enrollment-client";

export default async function EnrollmentPage() {
  const user = await requireAdmin();
  const db = createAdminClient();

  const [{ data: pegawai }, { data: enrolled }] = await Promise.all([
    db.from("pegawai").select("id, nama, nip").eq("instansi_id", user.instansiId).order("nama"),
    db.from("pegawai_face_enrollment").select("pegawai_id"),
  ]);

  const enrolledSet = new Set((enrolled ?? []).map((e) => e.pegawai_id as string));
  const list = (pegawai ?? []).map((p) => ({
    id: p.id as string,
    nama: p.nama as string,
    nip: (p.nip as string) ?? null,
    enrolled: enrolledSet.has(p.id as string),
  }));

  return <EnrollmentClient pegawai={list} />;
}
