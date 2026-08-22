import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { PenggunaManager } from "./pengguna-manager";

export default async function PenggunaPage() {
  const user = await requireSuperAdmin();
  const db = createAdminClient();

  const [{ data: adminRows }, { data: units }, { data: pegawai }] = await Promise.all([
    db.from("admin_unit_kerja").select("id, peran, auth_user_id, unit_kerja(nama)"),
    db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
    db
      .from("pegawai")
      .select("id, nama, nip, auth_user_id, unit_kerja(nama)")
      .eq("instansi_id", user.instansiId)
      .order("nama"),
  ]);

  // Petakan auth_user_id -> nama pegawai.
  const namaByAuth = new Map<string, string>();
  for (const p of pegawai ?? []) {
    if (p.auth_user_id) namaByAuth.set(p.auth_user_id as string, p.nama as string);
  }

  const daftarAdmin = (adminRows ?? []).map((a) => ({
    id: a.id as string,
    peran: a.peran as string,
    nama: namaByAuth.get(a.auth_user_id as string) ?? "(akun tanpa data pegawai)",
    unit: (a.unit_kerja as unknown as { nama: string } | null)?.nama ?? "—",
    isSelf: (a.auth_user_id as string) === user.authUserId,
  }));

  const kandidat = (pegawai ?? []).map((p) => ({
    id: p.id as string,
    nama: p.nama as string,
    nip: (p.nip as string) ?? null,
    punyaAkun: !!p.auth_user_id,
    unit: (p.unit_kerja as unknown as { nama: string } | null)?.nama ?? null,
  }));

  return (
    <PenggunaManager
      daftarAdmin={daftarAdmin}
      kandidat={kandidat}
      units={units ?? []}
      jumlahSuper={daftarAdmin.filter((a) => a.peran === "super_admin").length}
    />
  );
}
