# QRensi — Progress Tracker

> Mengikuti tahapan di **`MASTERPLAN.md`**. Status: ☐ belum · ◐ jalan · ☑ selesai · ⛔ blokir.
> **Terakhir diperbarui:** 2026-08-22 (Sesi #15)

---

## Status Global
**Mode:** Restrukturisasi terarah (ADR-0019) — fondasi dipertahankan, lapisan aplikasi dirombak.
**Tahap aktif:** **Tahap 5–6 (sisa)** — Tahap 1–4 selesai; 5.1, 6.2, 6.3 selesai
**Produksi:** `qrensi.vercel.app` (tertinggal di commit `8f93ba0`)

> ✅ Blokir push & deploy **teratasi**: kredensial GitHub diperbarui user; author commit
> diseragamkan ke `ngluyo` (Vercel Hobby menolak author lain — ADR-0022). Commit `9b52c38` ter-push.

---

## Dokumen rujukan
| Dokumen | Isi |
|---|---|
| `MASTERPLAN.md` | Rencana bertahap (Tahap 1–6) + DoD |
| `AUDIT.md` | Temuan bug + akar masalah terbukti |
| `RESEARCH.md` | Studi banding & praktik terbaik + sumber |
| `QA_CHECKLIST.md` | Checklist uji tiap tahap |
| `PRD.md` / `ARCHITECTURE.md` / `DESIGN.md` | Spesifikasi produk/teknis/visual |
| `DECISIONS.md` | ADR (21 keputusan) |
| `SESSION_LOG.md` | Jurnal per sesi |
| `SETUP_CHECKLIST.md` | Tugas user (akun/kredensial/migrasi) |

---

## Tahap 1 — Pemadaman Kebakaran (P0)
- ☑ 1.1 Fix logout → redirect **303** (bug A1)
- ☑ 1.2 Deploy commit tertinggal (digabung ke `9b52c38`, author diperbaiki)
- ☑ 1.3 Fix kamera: izin diminta **sebelum** muat model + fallback backend + error asli (bug A3)
- ☑ 1.4 Halaman **Akun Saya** (ganti password mandiri semua peran) (bug A2/B4)
- ☐ 1.5 Verifikasi di produksi: paksa ganti password + kamera + logout (butuh deploy)

## Tahap 2 — Modul Pegawai & Manajemen Akun (rombak total)
- ☑ 2.1 Daftar: pencarian nama/NIP + filter unit/status/akun + paginasi + badge
- ☑ 2.2 Halaman detail pegawai `/admin/pegawai/[id]`
- ☑ 2.3 Edit profil pegawai (nama/NIP/jabatan/unit/pola/status)
- ☑ 2.4 Aksi akun di detail (buat akun, reset password) + hapus pegawai
- ☑ 2.5 Enrollment wajah dari detail (preselect `?pegawai=`) + hapus data wajah
- ☑ 2.6 Manajemen admin `/admin/pengguna` (tunjuk/cabut Admin OPD & Super Admin, proteksi super admin terakhir)
- ☑ 2.7 Scoping `admin_unit` ke unitnya (`lib/izin.ts`: can/assertCan/scopeUnits — lihat PERAN.md)

**Tambahan Tahap 2 (permintaan user):**
- ☑ Ikon mata (lihat/sembunyi) di semua input kata sandi (`components/ui/password-input.tsx`)
- ☑ Self-service profil pegawai: data pribadi (no HP/email kontak/alamat) editable sendiri;
  data kepegawaian read-only (hanya admin) — migrasi **0008**
- ☑ Menu admin difilter peran; halaman & action konfigurasi digating `assertCan` (13/13 uji lulus)

## Tahap 3 — Pengalaman Pegawai (mobile-native) ✅
- ☑ 3.1 Onboarding pertama (kartu langkah: password → wajah → notifikasi, progres, auto-hilang)
- ☑ 3.2 Alur absensi: pesan error ramah + retry (termasuk `rate_limited`, `wajah_belum`, `masuk_belum`)
- ☑ 3.3 Riwayat interaktif: ketuk tanggal → **bottom sheet** rincian (jam aktual vs jadwal per sesi)
- ☑ 3.4 Self-service profil (Tahap 2)
- ☑ 3.5 Skeleton loading (beranda/riwayat/profil/pegawai/sanggahan/audit) + halaman 404 & error kustom
- ☑ 3.6 Install prompt PWA + panduan khusus iOS

## Tahap 4 — Integritas Data & Kepatuhan
- ☑ 4.1 Sanggahan disetujui → **menerapkan** status ke presensi (`lib/terapkan-izin.ts`); kehadiran faktual tidak ditimpa
- ☑ 4.2 Status `izin`/`sakit`/`cuti`/`dinas_luar` (migrasi **0009**) + label/warna di UI
- ☑ 4.3 Audit log aksi admin (`audit_admin` + `lib/audit.ts`), dipakai pada review sanggahan
- ☑ 4.4 **Unit test** logika kritis — `npm test` → **20/20 lulus**
- ☐ 4.5 `database.types.ts` (opsional; cast manual masih dipakai)

## Tahap 5 — Dashboard & Laporan Lanjutan
- ☑ 5.1 Dashboard admin: % kehadiran hari ini, statistik (aktif/hadir/telat/belum), "perlu tindakan"
  (izin pending, belum enroll), aktivitas terbaru — semua **discope per unit** untuk Admin OPD
- ☑ 5.2 Laporan cetak dgn filter **unit** (Admin OPD terkunci ke unitnya) + total agregat
- ☑ 5.3 Filter **periode bebas** (dari–sampai) + pintasan bulan ini/lalu

## Tahap 6 — Pengerasan & Rilis
- ☑ 6.1 Rate limit persisten (Upstash Redis) — **kode siap**, otomatis dipakai bila env diisi;
  fallback in-memory bila belum (app tetap jalan). Lihat SETUP_CHECKLIST §7.
- ☑ 6.2 Security headers (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy `camera=(self)`, no-cache `/sw.js`) — **terverifikasi**
- ☑ 6.3 Halaman 404/error kustom
- ⏸ 6.4 Uji beban — ditunda (keputusan user; skala pilot)
- ☐ 6.5 TWA/Bubblewrap → APK Android
- ☑ 6.6 Dokumen serah terima: PANDUAN_ADMIN, PANDUAN_PEGAWAI, RUNBOOK, INSTALASI

---

## Fondasi yang SUDAH TERUJI (jangan dibongkar — AUDIT §C)
Skema DB & migrasi 0001–0007 · klaim token atomik (1-dari-2) · rotasi QR · state machine jam kerja · potongan · cron tutup sesi · ekspor Sheets · backup Drive OAuth · device binding kiosk · face verify + liveness · design system "Laut" · PWA + push.

## White-label & Replikasi ✅
- ☑ Tabel `pengaturan_aplikasi` (migrasi 0011) + bucket `branding`
- ☑ Halaman `/admin/pengaturan`: nama aplikasi/organisasi, tagline, logo, warna brand, zona waktu, kontak bantuan
- ☑ Branding diterapkan ke: halaman awal, login, kiosk, judul tab, **manifest PWA dinamis**
- ☑ Frontend dibersihkan dari catatan progres internal
- ☑ `supabase/SETUP.sql` — satu berkas idempoten (gantikan APPLY_ALL.sql)
- ☑ `docs/INSTALASI.md` — panduan lengkap dari nol + `scripts/buat-admin.mjs`
- ☑ README dirombak jadi pintu masuk proyek

## Kemudahan Adopsi (hasil riset ulang) ✅
- ☑ **Diagnostik instalasi** `/admin/diagnostik` — 17 pemeriksaan (env, tabel, bucket privat,
  jam kerja, kiosk, super admin, integrasi) dgn saran perbaikan; tidak pernah menampilkan rahasia
- ☑ **Health check** `/api/health` untuk monitoring/uptime (200/503)
- ☑ Panduan pengguna akhir (admin & pegawai) + runbook operasional

## Menunggu User
- ☑ Migrasi 0011 sudah dijalankan — white-label aktif & terverifikasi.
- ☑ Upstash terpasang & **terverifikasi terhubung** — rate limit kini persisten.
- ☑ Migrasi 0009 & 0010 sudah dijalankan user.
- ⛔ **Akses push GitHub** (repo ada? kredensial?) — memblokir semua deploy
- ☐ Jalankan migrasi **0006** (sanggahan) & **0007** (push) bila belum
- ☐ Keputusan: kebijakan enrollment wajah (admin-only vs self-service terpandu)
- ☐ SK resmi jam kerja ASN Kotabaru (masih default seed)
