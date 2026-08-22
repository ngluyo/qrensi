import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { can, scopeUnits } from "@/lib/izin";
import { getRekapBulan } from "@/lib/presensi-data";
import { waktuInstansi } from "@/lib/sesi";
import { PegawaiDetail } from "./pegawai-detail";
import { ArrowLeft } from "lucide-react";

export default async function PegawaiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin();
  const db = createAdminClient();

  const { data: peg } = await db
    .from("pegawai")
    .select("id, nama, nip, jabatan, status_kepegawaian, auth_user_id, unit_kerja_id, pola_hari_kerja_id, instansi_id, instansi(timezone)")
    .eq("id", id)
    .maybeSingle();

  if (!peg || peg.instansi_id !== user.instansiId) notFound();

  // Admin OPD hanya boleh melihat pegawai unitnya.
  const lingkup = scopeUnits(user);
  if (lingkup && !lingkup.includes(peg.unit_kerja_id as string)) notFound();

  const [{ data: units }, { data: pola }, { data: enroll }] = await Promise.all([
    db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
    db.from("pola_hari_kerja").select("id, nama").eq("instansi_id", user.instansiId).order("nama"),
    db.from("pegawai_face_enrollment").select("enrolled_at").eq("pegawai_id", id).maybeSingle(),
  ]);

  // Email akun (bila ada).
  let email: string | null = null;
  if (peg.auth_user_id) {
    const { data: au } = await db.auth.admin.getUserById(peg.auth_user_id as string);
    email = au?.user?.email ?? null;
  }

  // Rekap bulan berjalan.
  const tz = (peg.instansi as unknown as { timezone: string })?.timezone ?? "Asia/Makassar";
  const w = waktuInstansi(tz);
  const [y, m] = w.tanggal.split("-").map(Number);
  const rekap = await getRekapBulan(db, id, tz, y, m - 1);

  // Unit yang boleh dipilih: super admin = semua; admin OPD = unitnya saja.
  const unitPilihan = (units ?? []).filter((u) => !lingkup || lingkup.includes(u.id as string));

  return (
    <div className="space-y-5">
      <Link href="/admin/pegawai" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" /> Daftar pegawai
      </Link>

      <PegawaiDetail
        pegawai={{
          id: peg.id as string,
          nama: peg.nama as string,
          nip: (peg.nip as string) ?? "",
          jabatan: (peg.jabatan as string) ?? "",
          unitKerjaId: peg.unit_kerja_id as string,
          polaId: peg.pola_hari_kerja_id as string,
          status: peg.status_kepegawaian as string,
          punyaAkun: !!peg.auth_user_id,
          email,
          enrolledAt: (enroll?.enrolled_at as string) ?? null,
        }}
        units={unitPilihan}
        pola={pola ?? []}
        rekap={{
          hadir: rekap.hadir,
          terlambat: rekap.terlambat,
          menit: rekap.menitTerlambat,
          alpa: rekap.tidakHadir,
          tidakDiKantor: rekap.tidakDiKantor,
        }}
        izin={{
          edit: can(user, "pegawai.edit", { unitKerjaId: peg.unit_kerja_id as string }),
          pindahUnit: can(user, "pegawai.pindah_unit"),
          akun: can(user, "akun.buat", { unitKerjaId: peg.unit_kerja_id as string }),
          wajah: can(user, "wajah.enroll", { unitKerjaId: peg.unit_kerja_id as string }),
          hapus: can(user, "pegawai.hapus", { unitKerjaId: peg.unit_kerja_id as string }),
        }}
      />
    </div>
  );
}
