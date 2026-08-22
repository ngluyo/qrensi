# QRensi — Progress Tracker

> Mengikuti tahapan di **`MASTERPLAN.md`**. Status: ☐ belum · ◐ jalan · ☑ selesai · ⛔ blokir.
> **Terakhir diperbarui:** 2026-08-22 (Sesi #15)

---

## Status Global
**Mode:** Restrukturisasi terarah (ADR-0019) — fondasi dipertahankan, lapisan aplikasi dirombak.
**Tahap aktif:** **Tahap 1 — Pemadaman Kebakaran (P0)**
**Produksi:** `qrensi.vercel.app` (tertinggal di commit `8f93ba0`)

> ⛔ **BLOKIR UTAMA:** `git push` ke `github.com/ngluyo/qrensi` gagal ("Repository not found").
> Commit `54b9258` (paksa ganti password, PDF, rate-limit) + perbaikan P0 **belum sampai produksi**.
> Butuh: konfirmasi repo masih ada / kredensial GitHub diperbarui.

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
- ⛔ 1.2 Deploy commit tertinggal `54b9258` — **terblokir push GitHub**
- ☑ 1.3 Fix kamera: izin diminta **sebelum** muat model + fallback backend + error asli (bug A3)
- ☑ 1.4 Halaman **Akun Saya** (ganti password mandiri semua peran) (bug A2/B4)
- ☐ 1.5 Verifikasi di produksi: paksa ganti password + kamera + logout (butuh deploy)

## Tahap 2 — Modul Pegawai & Manajemen Akun (rombak total)
- ☐ 2.1 Daftar: pencarian + filter unit/status + paginasi
- ☐ 2.2 Halaman detail pegawai `/admin/pegawai/[id]`
- ☐ 2.3 Edit profil pegawai
- ☐ 2.4 Aksi akun di detail (buat/reset/nonaktif)
- ☐ 2.5 Enrollment wajah dari detail pegawai
- ☐ 2.6 Manajemen admin (tunjuk/cabut peran)
- ☐ 2.7 Scoping `admin_unit` ke unitnya

## Tahap 3 — Pengalaman Pegawai (mobile-native)
- ☐ 3.1 Onboarding pertama (password → wajah → notifikasi)
- ☐ 3.2 Alur absensi disempurnakan (error ramah + retry)
- ☐ 3.3 Riwayat interaktif (detail per hari)
- ☐ 3.4 Self-service profil
- ☐ 3.5 Skeleton/empty/error konsisten
- ☐ 3.6 Install prompt PWA + panduan iOS

## Tahap 4 — Integritas Data & Kepatuhan
- ☐ 4.1 Sanggahan disetujui → ubah status presensi
- ☐ 4.2 Status `izin`/`sakit`/`cuti`/`dinas_luar` (migrasi)
- ☐ 4.3 Audit log aksi admin
- ☐ 4.4 Unit test logika kritis
- ☐ 4.5 `database.types.ts`

## Tahap 5 — Dashboard & Laporan Lanjutan
- ☐ 5.1 Dashboard admin (tren, top telat, pola)
- ☐ 5.2 Laporan per pegawai/unit (PDF)
- ☐ 5.3 Filter periode bebas

## Tahap 6 — Pengerasan & Rilis
- ☐ 6.1 Rate limit persisten (Upstash)
- ☐ 6.2 Security headers
- ☐ 6.3 Halaman 404/error kustom
- ☐ 6.4 Uji beban
- ☐ 6.5 TWA/Bubblewrap → APK Android
- ☐ 6.6 Dokumen serah terima

---

## Fondasi yang SUDAH TERUJI (jangan dibongkar — AUDIT §C)
Skema DB & migrasi 0001–0007 · klaim token atomik (1-dari-2) · rotasi QR · state machine jam kerja · potongan · cron tutup sesi · ekspor Sheets · backup Drive OAuth · device binding kiosk · face verify + liveness · design system "Laut" · PWA + push.

## Menunggu User
- ⛔ **Akses push GitHub** (repo ada? kredensial?) — memblokir semua deploy
- ☐ Jalankan migrasi **0006** (sanggahan) & **0007** (push) bila belum
- ☐ Keputusan: kebijakan enrollment wajah (admin-only vs self-service terpandu)
- ☐ SK resmi jam kerja ASN Kotabaru (masih default seed)
