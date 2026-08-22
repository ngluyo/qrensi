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
- ☑ Sheets: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_REKAP_ID` — sudah, **teruji** tulis ke "Rekap QRensi".

## 4b. Google Drive backup (OAuth — akun personal)
> Service account TIDAK bisa upload ke Drive personal (kuota 0 → gagal). Pakai OAuth (bertindak sebagai akun Anda).
- ☐ GCP (project sama) → **Enable Google Drive API**.
- ☐ **APIs & Services → Credentials → Create OAuth client ID → Desktop app** → catat Client ID & Secret.
- ☐ **OAuth consent screen:** User type External. Agar refresh token **tidak** kedaluwarsa 7 hari, set Publishing status ke **Production** (klik "Publish app"; abaikan peringatan "unverified" untuk pemakaian sendiri). Scope: `drive.file`.
- ☐ Ambil refresh token (jalankan lokal, butuh browser):
  ```bash
  node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
  ```
- ☐ Isi ke `.env.local` **dan** Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.
- App otomatis membuat folder **"QRensi Backup"** di Drive Anda (folder pra-buat tidak dipakai).

## 5. Secrets yang saya bantu generate (Anda tinggal simpan)
- ☑ `QR_SIGNING_SECRET` — sudah diisi user.
- ☑ `VAPID` keys — sudah digenerate & masuk `.env.local`.

## 6. Regulasi (paralel, non-teknis)
- ☐ Minta salinan resmi **Perbup/SE Bupati Kotabaru tentang Hari & Jam Kerja** ke Bagian Organisasi Setda / BKPSDM. Sementara pakai default seed di PRD §4.

---

### Prioritas sekarang
Hanya **#1 (Supabase)** yang memblokir kemajuan berikutnya. Sisanya bisa menyusul.


## 7. Upstash Redis — rate limit persisten (opsional, disarankan produksi)

**Kenapa perlu:** Vercel menjalankan banyak instance. Rate limit in-memory hanya berlaku
per-instance, jadi batas "10 percobaan/menit" bisa terlampaui. Upstash Redis membuat batas
berlaku global. Gratis (10.000 perintah/hari — jauh di atas kebutuhan kita).

**Langkah:**
1. Buka https://console.upstash.com → login.
2. Klik **Create Database** (kadang tertulis *Create* di kartu **Redis**).
3. Isi:
   - **Name:** `qrensi`
   - **Type/Primary Region:** pilih region terdekat — **Singapore (ap-southeast-1)**
   - **Eviction:** biarkan default. **TLS:** aktif (default).
   - Pastikan plan **Free**.
4. Klik **Create**.
5. Masuk ke database `qrensi` → gulir ke bagian **REST API** (bukan "Redis Connect").
6. Salin dua nilai:
   - `UPSTASH_REDIS_REST_URL` → berbentuk `https://xxx-yyy-12345.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → string panjang (klik ikon mata/Copy)
7. Tempel ke `.env.local` **dan** Vercel → Settings → Environment Variables (Production), lalu **Redeploy**.

> Jangan pakai nilai dari tab "Redis Connect" (itu format `redis://…` untuk koneksi TCP) —
> yang dibutuhkan adalah pasangan **REST URL + REST TOKEN**.

**Tanpa langkah ini aplikasi tetap jalan** (fallback in-memory), hanya perlindungan
brute-force-nya kurang ketat.
