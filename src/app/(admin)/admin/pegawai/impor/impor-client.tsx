"use client";

import { useActionState, useState } from "react";
import { pratinjauImpor, simpanImpor, type HasilPratinjau, type HasilSimpan } from "./actions";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, Download, FileSpreadsheet,
  TriangleAlert, XCircle, Copy, Check,
} from "lucide-react";

const initP: HasilPratinjau = { ok: false };
const initS: HasilSimpan = { ok: false };

/** Contoh isi berkas — dipakai untuk tombol unduh template. */
function templateCsv(unit: string, pola: string) {
  return [
    "nama,nip,jabatan,unit_kerja,pola_hari_kerja,email,no_hp,alamat",
    `Budi Santoso,198701012010011001,Analis Kepegawaian,${unit},${pola},budi@contoh.go.id,081234567890,Jl. Merdeka 1`,
    `Siti Aminah,198902022011012002,Pranata Komputer,${unit},${pola},siti@contoh.go.id,081234567891,Jl. Sudirman 2`,
  ].join("\n");
}

export function ImporClient({
  daftarUnit,
  daftarPola,
}: {
  daftarUnit: string[];
  daftarPola: string[];
}) {
  const [pra, praAction, praPending] = useActionState(pratinjauImpor, initP);
  const [simpan, simpanAction, simpanPending] = useActionState(simpanImpor, initS);
  const [salin, setSalin] = useState(false);

  const contohUnit = daftarUnit[0] ?? "Sekretariat";
  const contohPola = daftarPola[0] ?? "Senin-Jumat";

  function unduhTemplate() {
    const blob = new Blob(["﻿" + templateCsv(contohUnit, contohPola)], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template-impor-pegawai.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Sudah tersimpan → tampilkan hasil.
  if (simpan.ok) {
    const teksAkun = (simpan.akun ?? [])
      .map((a) => `${a.nama}\t${a.email}\t${a.password}`)
      .join("\n");
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-success">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <div className="font-bold">{simpan.dibuat} pegawai berhasil ditambahkan</div>
            {simpan.akun?.length ? (
              <div className="text-sm">{simpan.akun.length} akun login dibuat.</div>
            ) : null}
          </div>
        </div>

        {simpan.akun && simpan.akun.length > 0 && (
          <div className="space-y-3 rounded-2xl border-2 border-warning/50 bg-warning-soft p-4">
            <div className="text-sm font-bold text-warning">
              Kata sandi sementara — salin sekarang, tidak ditampilkan lagi.
            </div>
            <div className="max-h-72 overflow-auto rounded-lg bg-surface">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    {["Nama", "Email", "Kata sandi"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simpan.akun.map((a, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5">{a.nama}</td>
                      <td className="tabular px-3 py-1.5">{a.email}</td>
                      <td className="tabular px-3 py-1.5 font-bold">{a.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(teksAkun);
                setSalin(true);
                setTimeout(() => setSalin(false), 1500);
              }}
              className="pressable flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-fg"
            >
              {salin ? <Check className="size-4" /> : <Copy className="size-4" />} Salin semua
            </button>
          </div>
        )}

        <a href="/admin/pegawai" className="pressable inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg">
          Lihat daftar pegawai
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panduan format */}
      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <FileSpreadsheet className="size-4" /> Format berkas
        </h2>
        <p className="text-xs text-muted">
          Baris pertama wajib berisi judul kolom. Hanya <strong>nama</strong> yang wajib; sisanya
          opsional. Pemisah koma maupun titik-koma sama-sama diterima.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-xs">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th className="px-2 py-1.5 font-bold">Kolom</th>
                <th className="px-2 py-1.5 font-bold">Wajib</th>
                <th className="px-2 py-1.5 font-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5">
              <tr><td className="font-semibold">nama</td><td>✅</td><td>Nama lengkap</td></tr>
              <tr><td className="font-semibold">nip</td><td>—</td><td>Dipakai mendeteksi duplikat &amp; membuat email otomatis</td></tr>
              <tr><td className="font-semibold">jabatan</td><td>—</td><td>Contoh: Analis Kepegawaian</td></tr>
              <tr><td className="font-semibold">unit_kerja</td><td>—*</td><td>Harus <strong>sama persis</strong> dengan unit yang sudah ada</td></tr>
              <tr><td className="font-semibold">pola_hari_kerja</td><td>—*</td><td>Contoh: {contohPola}</td></tr>
              <tr><td className="font-semibold">email</td><td>—</td><td>Dipakai sebagai email login bila akun dibuat</td></tr>
              <tr><td className="font-semibold">no_hp</td><td>—</td><td>Contoh: 081234567890</td></tr>
              <tr><td className="font-semibold">alamat</td><td>—</td><td>Alamat tempat tinggal</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          *Boleh dikosongkan hanya bila di sistem baru ada satu unit / satu pola — nilai itu akan dipakai otomatis.
        </p>

        <div className="rounded-lg bg-surface-2 p-3">
          <div className="mb-1 text-xs font-bold">Nilai yang tersedia di sistem Anda</div>
          <div className="text-xs text-muted">
            <div><strong>Unit kerja:</strong> {daftarUnit.length ? daftarUnit.join(" · ") : "(belum ada — buat dulu)"}</div>
            <div className="mt-0.5"><strong>Pola hari kerja:</strong> {daftarPola.length ? daftarPola.join(" · ") : "(belum ada — buat dulu)"}</div>
          </div>
        </div>

        <button onClick={unduhTemplate} className="pressable flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-bold">
          <Download className="size-4" /> Unduh template CSV
        </button>
      </section>

      {/* Unggah */}
      <form action={praAction} className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-bold">1. Unggah berkas</h2>
        <input
          type="file"
          name="berkas"
          accept=".csv,text/csv"
          required
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold"
        />
        <button disabled={praPending} className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg disabled:opacity-60">
          {praPending ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          Periksa berkas
        </button>
        {!pra.ok && pra.message && (
          <p className="flex items-start gap-1.5 text-sm font-medium text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {pra.message}
          </p>
        )}
      </form>

      {/* Pratinjau */}
      {pra.ok && pra.baris && (
        <form action={simpanAction} className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-bold">2. Periksa hasil, lalu simpan</h2>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-success-soft px-3 py-1.5 text-success">{pra.ringkas?.siap} siap</span>
            <span className="rounded-lg bg-warning-soft px-3 py-1.5 text-warning">{pra.ringkas?.duplikat} duplikat (dilewati)</span>
            <span className="rounded-lg bg-danger-soft px-3 py-1.5 text-danger">{pra.ringkas?.galat} galat (dilewati)</span>
          </div>

          {pra.unitBaru && pra.unitBaru.length > 0 && (
            <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">
              Unit berikut belum ada di sistem: <strong>{pra.unitBaru.join(", ")}</strong>. Buat dulu
              di halaman Pegawai, atau perbaiki penulisannya di berkas.
            </p>
          )}

          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[40rem] text-xs">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  {["#", "Nama", "NIP", "Unit", "Pola", "Status"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pra.baris.map((b) => (
                  <tr key={b.no} className="border-t border-border">
                    <td className="tabular px-2 py-1.5 text-muted">{b.no}</td>
                    <td className="px-2 py-1.5 font-medium">{b.nama || <em className="text-danger">kosong</em>}</td>
                    <td className="tabular px-2 py-1.5">{b.nip ?? "—"}</td>
                    <td className="px-2 py-1.5">{b.unitNama}</td>
                    <td className="px-2 py-1.5">{b.polaNama}</td>
                    <td className="px-2 py-1.5">
                      {b.status === "siap" ? (
                        <span className="flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" /> siap</span>
                      ) : b.status === "duplikat" ? (
                        <span className="flex items-center gap-1 text-warning" title={b.pesan}><TriangleAlert className="size-3.5" /> {b.pesan}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger" title={b.pesan}><XCircle className="size-3.5" /> {b.pesan}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <input type="hidden" name="data" value={JSON.stringify(pra.baris)} />

          <label className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-sm">
            <input type="checkbox" name="buat_akun" className="mt-0.5 accent-brand" />
            <span>
              <strong>Sekaligus buat akun login</strong>
              <span className="block text-xs text-muted">
                Memakai email dari berkas; bila kosong dipakai <code>NIP@qrensi.local</code>.
                Kata sandi sementara akan ditampilkan sekali setelah proses selesai.
              </span>
            </span>
          </label>

          {!simpan.ok && simpan.message && (
            <p className="text-sm font-medium text-danger">{simpan.message}</p>
          )}

          <button
            disabled={simpanPending || (pra.ringkas?.siap ?? 0) === 0}
            className="pressable flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-bold text-brand-fg disabled:opacity-50"
          >
            {simpanPending ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
            Simpan {pra.ringkas?.siap ?? 0} pegawai
          </button>
        </form>
      )}
    </div>
  );
}
