import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { PegawaiManager } from "./pegawai-manager";

export default async function PegawaiPage() {
  const user = await requireAdmin();
  const db = createAdminClient();

  const [{ data: pegawai }, { data: units }, { data: pola }] = await Promise.all([
    db
      .from("pegawai")
      .select("id, nama, nip, jabatan, status_kepegawaian, auth_user_id, unit_kerja(nama), pola_hari_kerja(nama)")
      .eq("instansi_id", user.instansiId)
      .order("nama"),
    db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
    db.from("pola_hari_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
  ]);

  const list = (pegawai ?? []).map((p) => ({
    id: p.id as string,
    nama: p.nama as string,
    nip: (p.nip as string) ?? null,
    jabatan: (p.jabatan as string) ?? null,
    status: p.status_kepegawaian as string,
    punyaAkun: !!p.auth_user_id,
    unit: (p.unit_kerja as unknown as { nama: string } | null)?.nama ?? null,
    pola: (p.pola_hari_kerja as unknown as { nama: string } | null)?.nama ?? null,
  }));

  return <PegawaiManager pegawai={list} units={units ?? []} pola={pola ?? []} />;
}
