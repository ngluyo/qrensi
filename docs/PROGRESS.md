# QRensi — Progress Tracker

> Mengikuti tahapan di **`MASTERPLAN.md`**. Status: ☐ belum · ◐ jalan · ☑ selesai · ⛔ blokir.
> **Terakhir diperbarui:** 2026-08-22 (Sesi #15)

---

## Status Global
**Mode:** Restrukturisasi terarah (ADR-0019) — fondasi dipertahankan, lapisan aplikasi dirombak.
**Tahap aktif:** **Tahap 3 — Pengalaman Pegawai** (Tahap 1 & 2 selesai)
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
- ⚠️ Jalankan **`supabase/migrations/0008_data_pribadi_pegawai.sql`** (kolom no_hp/email_kontak/alamat) agar edit profil pegawai berfungsi
- ⛔ **Akses push GitHub** (repo ada? kredensial?) — memblokir semua deploy
- ☐ Jalankan migrasi **0006** (sanggahan) & **0007** (push) bila belum
- ☐ Keputusan: kebijakan enrollment wajah (admin-only vs self-service terpandu)
- ☐ SK resmi jam kerja ASN Kotabaru (masih default seed)
