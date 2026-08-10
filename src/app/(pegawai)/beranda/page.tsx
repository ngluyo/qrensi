import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSesiHariIni, getRekapBulan } from "@/lib/presensi-data";
import { waktuInstansi } from "@/lib/sesi";
import { BerandaClient } from "./beranda-client";

export default async function BerandaPage() {
  const user = await requireUser();
  const db = createAdminClient();

  // Profil pegawai + timezone instansi.
  const { data: pegawai } = await db
    .from("pegawai")
    .select("id, pola_hari_kerja_id, instansi_id, instansi(timezone)")
    .eq("auth_user_id", user.authUserId)
    .maybeSingle();

  if (!pegawai) {
    return <BerandaClient nama={user.nama ?? "Pegawai"} sesi={[]} rekap={null} />;
  }

  const tz = (pegawai.instansi as unknown as { timezone: string })?.timezone ?? "Asia/Makassar";
  const { sesi } = await getSesiHariIni(db, pegawai as never, tz);

  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  const rekap = await getRekapBulan(db, pegawai.id, tz, y, m - 1);

  return (
    <BerandaClient
      nama={user.nama ?? "Pegawai"}
      sesi={sesi}
      rekap={{ hadir: rekap.hadir, terlambat: rekap.terlambat, menit: rekap.menitTerlambat }}
    />
  );
}
