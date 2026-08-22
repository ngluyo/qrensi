"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  simpanProfilPegawai,
  buatAkunDetail,
  resetPasswordDetail,
  hapusEnrollment,
  hapusPegawai,
  type DetailState,
} from "./actions";
import {
  Save, KeyRound, RotateCcw, ScanFace, Trash2, Copy, Check,
  CheckCircle2, AlertCircle, CalendarDays,
} from "lucide-react";

interface Opt { id: string; nama: string }
interface Pegawai {
  id: string; nama: string; nip: string; jabatan: string;
  unitKerjaId: string; polaId: string; status: string;
  punyaAkun: boolean; email: string | null; enrolledAt: string | null;
}

const init: DetailState = { ok: false };

export function PegawaiDetail({
  pegawai, units, pola, rekap, izin,
}: {
  pegawai: Pegawai;
  units: Opt[];
  pola: Opt[];
  rekap: { hadir: number; terlambat: number; menit: number; alpa: number; tidakDiKantor: number };
  izin: { edit: boolean; pindahUnit: boolean; akun: boolean; wajah: boolean; hapus: boolean };
}) {
  const [profil, aksiProfil, profilPending] = useActionState(simpanProfilPegawai, init);
  const [akun, aksiAkun, akunPending] = useActionState(buatAkunDetail, init);
  const [reset, aksiReset, resetPending] = useActionState(resetPasswordDetail, init);

  const kredensial = akun.ok && akun.password ? akun : reset.ok && reset.password ? reset : null;

  return (
    <div className="space-y-5">
      {/* Kartu identitas */}
      <div className="flex items-center gap-4 rounded-2xl bg-brand p-5 text-brand-fg shadow-[var(--shadow-md)]">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15 text-xl font-bold">
          {pegawai.nama.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{pegawai.nama}</div>
          <div className="tabular truncate text-xs opacity-70">
            {pegawai.nip || "NIP belum diisi"}{pegawai.jabatan ? ` · ${pegawai.jabatan}` : ""}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag>{pegawai.punyaAkun ? "Ada akun" : "Belum akun"}</Tag>
            <Tag>{pegawai.enrolledAt ? "Wajah terdaftar" : "Wajah belum"}</Tag>
            <Tag>{pegawai.status}</Tag>
          </div>
        </div>
      </div>

      {kredensial && <BannerKredensial email={kredensial.email!} password={kredensial.password!} />}

      {/* Rekap bulan ini */}
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <CalendarDays className="size-4 text-muted" /> Rekap bulan ini
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <Statistik label="Hadir" nilai={rekap.hadir} tone="text-success" />
          <Statistik label="Telat" nilai={rekap.terlambat} tone="text-warning" />
          <Statistik label="Alpa" nilai={rekap.alpa} tone="text-danger" />
          <Statistik label="Tdk di kantor" nilai={rekap.tidakDiKantor} tone="text-info" />
        </div>
      </section>

      {/* Edit profil */}
      <form action={aksiProfil} className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <input type="hidden" name="id" value={pegawai.id} />
        <h2 className="text-sm font-bold">Profil pegawai</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama" name="nama" defaultValue={pegawai.nama} required disabled={!izin.edit} />
          <Field label="NIP" name="nip" defaultValue={pegawai.nip} disabled={!izin.edit} />
          <Field label="Jabatan" name="jabatan" defaultValue={pegawai.jabatan} disabled={!izin.edit} />
          <Select
            label={`Unit kerja${!izin.pindahUnit ? " (hanya super admin)" : ""}`}
            name="unit_kerja_id"
            defaultValue={pegawai.unitKerjaId}
            options={units}
            disabled={!izin.edit || !izin.pindahUnit}
          />
          <Select label="Pola hari kerja" name="pola_hari_kerja_id" defaultValue={pegawai.polaId} options={pola} disabled={!izin.edit} />
          <Select
            label="Status kepegawaian"
            name="status_kepegawaian"
            defaultValue={pegawai.status}
            options={[{ id: "aktif", nama: "Aktif" }, { id: "cuti", nama: "Cuti" }, { id: "nonaktif", nama: "Nonaktif" }]}
            disabled={!izin.edit}
          />
        </div>
        {profil.message && (
          <p className={`flex items-center gap-1.5 text-sm font-medium ${profil.ok ? "text-success" : "text-danger"}`}>
            {profil.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            {profil.message}
          </p>
        )}
        {izin.edit && (
          <button disabled={profilPending} className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-bold text-brand-fg disabled:opacity-60">
            <Save className="size-4" /> Simpan perubahan
          </button>
        )}
      </form>

      {/* Akun login */}
      {izin.akun && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-bold">Akun login</h2>
          {pegawai.punyaAkun ? (
            <>
              <p className="tabular text-xs text-muted">Email: {pegawai.email ?? "—"}</p>
              <form action={aksiReset}>
                <input type="hidden" name="id" value={pegawai.id} />
                <button disabled={resetPending} className="pressable flex items-center gap-2 rounded-xl bg-text px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-60">
                  <RotateCcw className="size-4" /> Reset kata sandi
                </button>
              </form>
              <p className="text-xs text-muted">Pegawai wajib mengganti kata sandi saat login berikutnya.</p>
            </>
          ) : (
            <form action={aksiAkun} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={pegawai.id} />
              <label className="min-w-[12rem] flex-1">
                <span className="mb-1 block text-xs font-semibold text-muted">Email (kosong = pakai NIP)</span>
                <input name="email" type="email" placeholder="nama@instansi.go.id" className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
              </label>
              <button disabled={akunPending} className="pressable flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-fg disabled:opacity-60">
                <KeyRound className="size-4" /> Buat akun
              </button>
            </form>
          )}
          {(akun.message && !akun.ok) && <p className="text-sm font-medium text-danger">{akun.message}</p>}
          {(reset.message && !reset.ok) && <p className="text-sm font-medium text-danger">{reset.message}</p>}
        </section>
      )}

      {/* Enrollment wajah */}
      {izin.wajah && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-bold">Enrollment wajah</h2>
          <p className="text-xs text-muted">
            {pegawai.enrolledAt
              ? `Terdaftar pada ${new Date(pegawai.enrolledAt).toLocaleDateString("id-ID")}`
              : "Belum terdaftar — pegawai belum bisa diverifikasi wajahnya."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/enrollment?pegawai=${pegawai.id}`} className="pressable flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-fg">
              <ScanFace className="size-4" /> {pegawai.enrolledAt ? "Daftar ulang" : "Daftarkan wajah"}
            </Link>
            {pegawai.enrolledAt && (
              <form action={hapusEnrollment}>
                <input type="hidden" name="id" value={pegawai.id} />
                <button className="pressable rounded-xl px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger-soft">
                  Hapus data wajah
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Zona berbahaya */}
      {izin.hapus && (
        <form action={hapusPegawai} className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-4">
          <input type="hidden" name="id" value={pegawai.id} />
          <h2 className="text-sm font-bold text-danger">Hapus pegawai</h2>
          <p className="mt-1 text-xs text-muted">Menghapus data pegawai beserta relasinya. Tidak bisa dibatalkan.</p>
          <button className="pressable mt-3 flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-bold text-white">
            <Trash2 className="size-4" /> Hapus pegawai
          </button>
        </form>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold capitalize">{children}</span>;
}

function Statistik({ label, nilai, tone }: { label: string; nilai: number; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2.5 text-center">
      <div className={`tabular text-xl font-extrabold leading-none ${tone}`}>{nilai}</div>
      <div className="mt-1 text-[10px] leading-tight text-muted">{label}</div>
    </div>
  );
}

function BannerKredensial({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border-2 border-warning/50 bg-warning-soft p-4">
      <div className="text-sm font-bold text-warning">Kredensial dibuat — salin sekarang, tidak ditampilkan lagi.</div>
      <div className="tabular space-y-1 rounded-lg bg-surface px-3 py-2 text-sm">
        <div>Email: <strong>{email}</strong></div>
        <div>Password: <strong>{password}</strong></div>
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(`Email: ${email}\nPassword sementara: ${password}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="pressable flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-fg"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Salin kredensial
      </button>
    </div>
  );
}

function Field({ label, name, defaultValue, required, disabled }: { label: string; name: string; defaultValue?: string; required?: boolean; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60"
      />
    </label>
  );
}

function Select({ label, name, defaultValue, options, disabled }: { label: string; name: string; defaultValue?: string; options: Opt[]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:opacity-60"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
      </select>
    </label>
  );
}
