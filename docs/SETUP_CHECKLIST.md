# QRensi — Setup Checklist (Tugas untuk User)

> Hal-hal yang **hanya Anda** yang bisa lakukan (butuh akun/kredensial). Claude akan bangun kode yang menunggu nilai-nilai ini.
> Tandai ☑ jika sudah, dan kirimkan nilainya (untuk secret, taruh ke `.env.local` — jangan tempel di chat kalau bisa dihindari).

---

## 1. Supabase (PALING DIBUTUHKAN — untuk jalan lokal)
- ☐ Buat project di https://supabase.com/dashboard/new → region **Singapore** → Free plan → nama `qrensi`.
- ☐ Catat dari Project Settings → API:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (rahasia — server only)
- ☐ SQL Editor → jalankan:
  ```sql
  create extension if not exists "uuid-ossp";
  create extension if not exists pgcrypto;
  create extension if not exists vector;
  ```
- ⛔ **BELUM:** jalankan schema. Buka **SQL Editor** → tempel isi **`supabase/APPLY_ALL.sql`** → Run (sekali). Ini bikin semua tabel + seed + RLS.

**Yang saya butuh dari Anda:** ketiga nilai API di atas → taruh ke `.env.local` (saya siapkan `.env.example`).

## 2. GitHub (untuk versi & CI)
- ☐ Buat repo `qrensi` (privat disarankan untuk data pemerintah).
- ☐ Beri tahu saya URL remote, atau Anda jalankan sendiri `git remote add origin ...`.

## 3. Vercel (untuk deploy — bisa nanti)
- ☐ Login pakai akun GitHub → Import repo `qrensi`.
- ☐ Isi Environment Variables (sama seperti `.env.local`) di dashboard Vercel.
- ⚠️ Cek fair-use: Hobby melarang "commercial use". App internal pemerintah biasanya aman, tapi pertimbangkan Vercel Pro atau Cloudflare Pages bila ragu.

## 4. Google Cloud — Sheets & Drive API (Fase 3, belum mendesak)
- ☐ New Project `qrensi` di https://console.cloud.google.com
- ☐ Enable **Google Sheets API** + **Google Drive API**.
- ☐ Buat Service Account → Keys → JSON. Dari JSON ambil `client_email` & `private_key`.
- ☐ Buat 1 spreadsheet kosong + 1 folder Drive, **share ke `client_email`** (Editor).
- ☐ Kirim: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_REKAP_ID`, `GOOGLE_DRIVE_BACKUP_FOLDER_ID`.

## 5. Secrets yang saya bantu generate (Anda tinggal simpan)
- ☑ `QR_SIGNING_SECRET` — sudah diisi user.
- ☑ `VAPID` keys — sudah digenerate & masuk `.env.local`.

## 6. Regulasi (paralel, non-teknis)
- ☐ Minta salinan resmi **Perbup/SE Bupati Kotabaru tentang Hari & Jam Kerja** ke Bagian Organisasi Setda / BKPSDM. Sementara pakai default seed di PRD §4.

---

### Prioritas sekarang
Hanya **#1 (Supabase)** yang memblokir kemajuan berikutnya. Sisanya bisa menyusul.
