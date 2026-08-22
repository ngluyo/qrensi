import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { scopeUnits, labelPeran } from "@/lib/izin";
import { waktuInstansi } from "@/lib/sesi";
import { STATUS_META, TONE_CLASS, type StatusKey } from "@/lib/status-presensi";
import { Users, UserCheck, Clock, UserX, ArrowRight, FileText, ScanFace, TriangleAlert } from "lucide-react";

export default async function AdminHome() {
  const user = await requireAdmin();
  const db = createAdminClient();
  const lingkup = scopeUnits(user);

  const { data: inst } = await db.from("instansi").select("timezone").eq("id", user.instansiId).single();
  const tz = inst?.timezone ?? "Asia/Makassar";
  const w = waktuInstansi(tz);

  // Pegawai dalam lingkup.
  let pegQ = db.from("pegawai").select("id, nama, unit_kerja_id").eq("instansi_id", user.instansiId).eq("status_kepegawaian", "aktif");
  if (lingkup) pegQ = pegQ.in("unit_kerja_id", lingkup.length ? lingkup : ["-"]);
  const { data: pegawai } = await pegQ;
  const pegIds = (pegawai ?? []).map((p) => p.id as string);
  const namaById = new Map((pegawai ?? []).map((p) => [p.id as string, p.nama as string]));

  // Presensi hari ini.
  const { data: presHariIni } = pegIds.length
    ? await db
        .from("presensi")
        .select("pegawai_id, status, menit_keterlambatan, sesi_absensi_harian!inner(tanggal, jam_kerja_sesi(jenis_sesi))")
        .in("pegawai_id", pegIds)
        .eq("sesi_absensi_harian.tanggal", w.tanggal)
    : { data: [] };

  const masukRows = (presHariIni ?? []).filter(
    (p) => (p.sesi_absensi_harian as unknown as { jam_kerja_sesi: { jenis_sesi: string } | null }).jam_kerja_sesi?.jenis_sesi === "masuk",
  );
  const hadir = masukRows.filter((p) => p.status === "tepat_waktu" || p.status === "terlambat").length;
  const telat = masukRows.filter((p) => p.status === "terlambat").length;
  const alpa = masukRows.filter((p) => p.status === "tidak_hadir").length;
  const belum = Math.max(0, pegIds.length - masukRows.length);

  // Menunggu tindakan.
  let sangQ = db.from("sanggahan").select("id", { count: "exact", head: true }).eq("instansi_id", user.instansiId).eq("status", "pending");
  if (lingkup && pegIds.length) sangQ = sangQ.in("pegawai_id", pegIds);
  const { count: pendingSanggahan } = await sangQ;

  const { data: enrolled } = pegIds.length
    ? await db.from("pegawai_face_enrollment").select("pegawai_id").in("pegawai_id", pegIds)
    : { data: [] };
  const belumEnroll = pegIds.length - (enrolled ?? []).length;

  // Aktivitas terbaru (10 presensi terakhir hari ini).
  const terbaru = [...(presHariIni ?? [])]
    .slice(-10)
    .reverse()
    .map((p) => ({
      nama: namaById.get(p.pegawai_id as string) ?? "—",
      status: p.status as StatusKey,
      menit: (p.menit_keterlambatan as number) ?? 0,
      jenis: (p.sesi_absensi_harian as unknown as { jam_kerja_sesi: { jenis_sesi: string } | null }).jam_kerja_sesi?.jenis_sesi ?? "-",
    }));

  const stat = [
    { label: "Pegawai aktif", nilai: pegIds.length, icon: Users, tone: "text-brand bg-brand-soft" },
    { label: "Hadir hari ini", nilai: hadir, icon: UserCheck, tone: "text-success bg-success-soft" },
    { label: "Terlambat", nilai: telat, icon: Clock, tone: "text-warning bg-warning-soft" },
    { label: "Belum absen", nilai: belum + alpa, icon: UserX, tone: "text-danger bg-danger-soft" },
  ];

  const persenHadir = pegIds.length ? Math.round((hadir / pegIds.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {labelPeran(user)} · {lingkup ? "unit yang Anda ampu" : "seluruh instansi"}
        </p>
      </header>

      {/* Kehadiran hari ini */}
      <section className="rounded-[var(--radius-lg)] bg-brand p-5 text-brand-fg shadow-[var(--shadow-md)]">
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">Kehadiran hari ini</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="tabular text-4xl font-extrabold leading-none">{persenHadir}%</span>
          <span className="tabular pb-1 text-sm opacity-70">{hadir} dari {pegIds.length} pegawai</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${persenHadir}%` }} />
        </div>
      </section>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-3">
        {stat.map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
            <div className={`grid size-10 place-items-center rounded-xl ${s.tone}`}>
              <s.icon className="size-5" />
            </div>
            <div className="tabular mt-3 text-3xl font-extrabold leading-none">{s.nilai}</div>
            <div className="mt-1 text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Perlu tindakan */}
      {((pendingSanggahan ?? 0) > 0 || belumEnroll > 0) && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-muted">Perlu tindakan</h2>
          {(pendingSanggahan ?? 0) > 0 && (
            <Link href="/admin/sanggahan" className="pressable flex items-center gap-3 rounded-2xl bg-warning-soft p-4">
              <FileText className="size-5 shrink-0 text-warning" />
              <span className="flex-1 text-sm font-semibold text-warning">
                {pendingSanggahan} pengajuan izin menunggu persetujuan
              </span>
              <ArrowRight className="size-4 text-warning" />
            </Link>
          )}
          {belumEnroll > 0 && (
            <Link href="/admin/enrollment" className="pressable flex items-center gap-3 rounded-2xl bg-info-soft p-4">
              <ScanFace className="size-5 shrink-0 text-info" />
              <span className="flex-1 text-sm font-semibold text-info">
                {belumEnroll} pegawai belum enrollment wajah
              </span>
              <ArrowRight className="size-4 text-info" />
            </Link>
          )}
        </section>
      )}

      {/* Aktivitas terbaru */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted">Aktivitas hari ini</h2>
        {terbaru.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-[var(--shadow-sm)]">
            <TriangleAlert className="mx-auto mb-2 size-7 opacity-40" />
            Belum ada aktivitas presensi hari ini.
          </div>
        ) : (
          <div className="space-y-2">
            {terbaru.map((t, i) => {
              const meta = STATUS_META[t.status] ?? STATUS_META.belum;
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-sm)]">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {t.nama.charAt(0).toUpperCase()}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.nama}</span>
                  <span className="text-xs capitalize text-muted">{t.jenis}</span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[meta.tone]}`}>
                    {meta.label}{t.menit ? ` ${t.menit}m` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
