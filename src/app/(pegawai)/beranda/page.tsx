import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSesiHariIni, getRekapBulan } from "@/lib/presensi-data";
import { waktuInstansi } from "@/lib/sesi";
import { BerandaClient } from "./beranda-client";
import { OnboardingCard, type LangkahOnboarding } from "@/components/onboarding-card";
import { InstallPrompt } from "@/components/install-prompt";

export default async function BerandaPage() {
  const user = await requireUser();
  const db = createAdminClient();

  const { data: pegawai } = await db
    .from("pegawai")
    .select("id, pola_hari_kerja_id, instansi_id, no_hp, instansi(timezone)")
    .eq("auth_user_id", user.authUserId)
    .maybeSingle();

  if (!pegawai) {
    return <BerandaClient nama={user.nama ?? "Pegawai"} sesi={[]} rekap={null} />;
  }

  const tz = (pegawai.instansi as unknown as { timezone: string })?.timezone ?? "Asia/Makassar";
  const [{ sesi }, enroll] = await Promise.all([
    getSesiHariIni(db, pegawai as never, tz),
    db.from("pegawai_face_enrollment").select("pegawai_id").eq("pegawai_id", pegawai.id).maybeSingle(),
  ]);

  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  const rekap = await getRekapBulan(db, pegawai.id, tz, y, m - 1);

  // Langkah onboarding pegawai baru (MASTERPLAN 3.1).
  const langkah: LangkahOnboarding[] = [
    {
      kunci: "password",
      judul: "Ganti kata sandi",
      desc: "Amankan akun dengan kata sandi sendiri",
      selesai: !user.mustChangePassword,
      href: "/ganti-password",
    },
    {
      kunci: "wajah",
      judul: "Daftarkan wajah",
      desc: "Diperlukan untuk verifikasi saat absen",
      selesai: !!enroll.data,
      catatan: enroll.data ? undefined : "Hubungi admin kepegawaian unit Anda",
    },
    {
      kunci: "notifikasi",
      judul: "Aktifkan notifikasi",
      desc: "Pengingat & info penting",
      selesai: false, // status sebenarnya diketahui di klien (NotifToggle)
    },
  ];

  return (
    <div className="space-y-6">
      <OnboardingCard langkah={langkah} />
      <BerandaClient
        nama={user.nama ?? "Pegawai"}
        sesi={sesi}
        rekap={{ hadir: rekap.hadir, terlambat: rekap.terlambat, menit: rekap.menitTerlambat }}
      />
      <InstallPrompt />
    </div>
  );
}
