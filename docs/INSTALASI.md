# Panduan Instalasi QRensi — dari Nol sampai Jalan

> Dokumen ini untuk **siapa pun** yang ingin memakai QRensi: pemerintah daerah,
> perusahaan, sekolah, yayasan, atau organisasi lain. Semua identitas aplikasi
> (nama, logo, warna, organisasi) bisa diganti dari dalam aplikasi — **tanpa
> mengubah kode**.
>
> Perkiraan waktu: **45–90 menit**. Biaya: **Rp 0** (semua paket gratis).

---

## Daftar Isi
1. [Yang perlu disiapkan](#1-yang-perlu-disiapkan)
2. [Membuat database (Supabase)](#2-membuat-database-supabase)
3. [Menyiapkan berkas kode](#3-menyiapkan-berkas-kode)
4. [Mengisi environment variables](#4-mengisi-environment-variables)
5. [Membuat akun admin pertama](#5-membuat-akun-admin-pertama)
6. [Menjalankan di komputer](#6-menjalankan-di-komputer)
7. [Deploy ke internet (Vercel)](#7-deploy-ke-internet-vercel)
8. [Menyesuaikan identitas (white-label)](#8-menyesuaikan-identitas-white-label)
9. [Integrasi opsional](#9-integrasi-opsional)
10. [Konfigurasi awal operasional](#10-konfigurasi-awal-operasional)
11. [Masalah umum](#11-masalah-umum)

---

## 1. Yang perlu disiapkan

**Perangkat lunak di komputer:**

| Alat | Versi | Unduh |
|---|---|---|
| Node.js | 20 LTS atau lebih baru | https://nodejs.org |
| Git | terbaru | https://git-scm.com |
| Editor (disarankan VS Code) | — | https://code.visualstudio.com |

Cek pemasangan:
```bash
node -v
```
```bash
git --version
```

**Akun yang perlu dibuat (semuanya gratis):**
- **Supabase** — database & autentikasi → https://supabase.com
- **Vercel** — hosting → https://vercel.com (login pakai GitHub agar mudah)
- **GitHub** — penyimpanan kode → https://github.com

**Perangkat untuk operasional:**
- 1 tablet/laptop/Android box per titik presensi (untuk **kiosk** penampil QR)
- HP pegawai (Android/iOS) — cukup browser, tidak perlu pasang dari toko aplikasi

---

## 2. Membuat database (Supabase)

### 2.1 Buat project
1. Buka https://supabase.com/dashboard → **New project**
2. Isi:
   - **Name:** `qrensi` (bebas)
   - **Database Password:** buat yang kuat, **simpan baik-baik**
   - **Region:** pilih terdekat — untuk Indonesia: **Southeast Asia (Singapore)**
3. Klik **Create new project**, tunggu ±2 menit sampai selesai.

### 2.2 Jalankan skema database (SEKALI JALAN)
1. Di menu kiri pilih **SQL Editor** → **New query**
2. Buka berkas **`supabase/SETUP.sql`** dari kode ini, **salin seluruh isinya**
3. Tempel ke editor → klik **Run** (atau Ctrl+Enter)
4. Tunggu sampai muncul **Success**

> Berkas ini sudah mencakup semua tabel, indeks, keamanan (RLS), dan data awal.
> **Aman dijalankan berulang** — jika sudah ada, bagian itu dilewati.

Verifikasi (opsional) — jalankan di SQL Editor:
```sql
select count(*) as jumlah_tabel from information_schema.tables where table_schema = 'public';
```
Harus menunjukkan sekitar **17 tabel**.

### 2.3 Buat Storage bucket
Menu kiri → **Storage** → **New bucket**. Buat **4 bucket**, semuanya **Private** (jangan dicentang "Public"):

| Nama bucket | Isi | Batas ukuran |
|---|---|---|
| `avatar` | Foto profil pegawai | 2 MB |
| `sanggahan` | Lampiran izin/sakit/cuti | 5 MB |
| `branding` | Logo organisasi | 1 MB |
| `wajah` | Cadangan foto enrollment (opsional) | 2 MB |

### 2.4 Catat kunci API
Menu kiri → **Project Settings** (ikon gerigi) → **API**. Catat tiga nilai:

| Yang dicari | Dipakai sebagai |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key (klik "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **service_role** adalah kunci super. Jangan pernah dibagikan, jangan
> ditempel ke kode, jangan di-commit ke GitHub.

---

## 3. Menyiapkan berkas kode

```bash
git clone https://github.com/ngluyo/qrensi.git
```
```bash
cd qrensi
```
```bash
npm install
```

---

## 4. Mengisi environment variables

Salin contoh berkas menjadi berkas nyata:

```bash
cp .env.example .env.local
```

Buka `.env.local`, isi satu per satu:

### 4.1 Wajib — Supabase
Dari langkah [2.4](#24-catat-kunci-api):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### 4.2 Wajib — kunci penanda tangan QR
Buat kunci acak. **PowerShell (Windows):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Salin hasilnya ke:
```
QR_SIGNING_SECRET=hasil_acak_tadi
```

### 4.3 Wajib — pelindung cron
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```
```
CRON_SECRET=hasil_acak_tadi
```

### 4.4 Disarankan — notifikasi (Web Push)
```bash
npx web-push generate-vapid-keys
```
Salin dua nilai yang muncul:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=xxxx
```

### 4.5 Opsional — sisanya
Google Sheets/Drive dan Upstash dijelaskan di [bagian 9](#9-integrasi-opsional).
Boleh dikosongkan dulu; aplikasi tetap jalan.

---

## 5. Membuat akun admin pertama

**Cara mudah (disarankan):** jalankan aplikasi dulu (langkah 6), lalu buka
alamatnya di browser. Karena belum ada admin, Anda otomatis diarahkan ke
**halaman setup** untuk mengisi identitas organisasi dan membuat akun
administrator — tanpa perlu terminal. Rinciannya di
[`SETUP_WIZARD.md`](SETUP_WIZARD.md).

**Alternatif lewat terminal:**

```bash
node scripts/buat-admin.mjs admin@organisasi.go.id "Nama Lengkap Admin"
```

Skrip menampilkan **kata sandi sementara** — simpan. Saat login pertama, sistem
otomatis meminta Anda menggantinya.

---

## 6. Menjalankan di komputer

```bash
npm run dev
```

Buka http://localhost:3000 lalu login dengan akun dari langkah 5.

> **Kamera (enrollment & verifikasi wajah)** hanya bekerja di `localhost` atau
> alamat **HTTPS**. Untuk uji di HP sebelum deploy, pakai tunnel:
> ```bash
> npx ngrok http 3000
> ```

Menjalankan uji otomatis (opsional):
```bash
npm test
```

---

## 7. Deploy ke internet (Vercel)

1. Push kode ke GitHub Anda sendiri (repo **privat** disarankan).
2. Buka https://vercel.com/new → **Import** repo tersebut.
3. Sebelum klik Deploy, buka **Environment Variables** dan masukkan **semua**
   isi `.env.local` Anda (nama dan nilainya sama persis), pilih lingkungan
   **Production**.
4. Klik **Deploy**, tunggu sampai **Ready**.
5. Cek **Settings → Cron Jobs** — harus ada 2 pekerjaan terjadwal.

> **Catatan paket Hobby (gratis):** cron dibatasi **1× per hari per pekerjaan**.
> Itu sudah cukup: cron hanya merapikan status di akhir hari; presensi pegawai
> tercatat seketika saat memindai.

---

## 8. Menyesuaikan identitas (white-label)

Login sebagai Super Admin → **Panel Admin → Pengaturan Aplikasi**. Di sana bisa diubah:

| Kolom | Contoh |
|---|---|
| Nama aplikasi | `Presensi SMAN 1` / `Absensi PT Maju Jaya` |
| Nama organisasi | `SMA Negeri 1 Kotabaru` |
| Tagline | kalimat singkat di halaman awal |
| Logo | PNG/SVG, maks 1 MB |
| Warna brand | pilih dari color picker |
| Zona waktu | WIB / WITA / WIT |
| Kontak bantuan | ditampilkan ke pegawai |

Perubahan langsung berlaku di seluruh aplikasi: halaman awal, login, layar
kiosk, judul tab browser, dan **ikon/nama aplikasi PWA** saat dipasang di HP.

---

## 9. Integrasi opsional

### 9.1 Google Sheets — ekspor rekap
1. https://console.cloud.google.com → **New Project**
2. **APIs & Services → Library** → aktifkan **Google Sheets API**
3. **Credentials → Create Credentials → Service Account** → beri nama → **Done**
4. Klik service account → tab **Keys → Add Key → JSON** → berkas terunduh
5. Dari JSON, ambil `client_email` dan `private_key`
6. Buat Google Spreadsheet kosong, klik **Share**, bagikan ke `client_email`
   tadi sebagai **Editor**
7. Ambil ID spreadsheet dari URL: `docs.google.com/spreadsheets/d/<ID>/edit`

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_REKAP_ID=<ID spreadsheet>
```

### 9.2 Google Drive — cadangan CSV
> Service account **tidak bisa** mengunggah ke Drive pribadi (kuotanya 0).
> Karena itu Drive memakai OAuth atas nama akun Anda.

1. Aktifkan **Google Drive API** di project yang sama
2. **OAuth consent screen** → User Type **External** → isi data → **PUBLISH APP**
   (penting: kalau tetap "Testing", token kedaluwarsa tiap 7 hari)
3. **Credentials → Create Credentials → OAuth client ID → Desktop app** → catat
   Client ID & Client Secret
4. Jalankan:
   ```bash
   node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
   ```
5. Buka URL yang tercetak di browser → izinkan → token tercetak di terminal

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

### 9.3 Upstash Redis — pembatas laju permintaan
1. https://console.upstash.com → **Create Database**
2. Name `qrensi`, Region **Singapore**, plan **Free** → **Create**
3. Buka database → bagian **REST API** (bukan "Redis Connect")

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 10. Konfigurasi awal operasional

Setelah aplikasi jalan, lakukan berurutan di **Panel Admin**:

1. **Pengaturan Aplikasi** — identitas & zona waktu organisasi Anda
2. **Pola Hari Kerja** — mis. Senin–Jumat / Senin–Sabtu
3. **Jam Kerja** — jam masuk, istirahat, pulang per hari
   *(sesuaikan dengan aturan resmi organisasi Anda; nilai bawaan hanya contoh)*
4. **Potongan** — aturan potongan berjenjang (kosongkan bila tidak dipakai)
5. **Pegawai** — tambah unit kerja, lalu tambah pegawai
6. **Pegawai → detail** — buat akun login, serahkan kata sandi sementara
7. **Enrollment** — daftarkan wajah tiap pegawai (didampingi petugas)
8. **Kiosk** — daftarkan perangkat, salin *device secret* satu kali, lalu buka
   `/kiosk/tampilan` di perangkat kiosk dan tempel secret tersebut
9. **Pengguna & Peran** — tunjuk Admin OPD/unit agar pekerjaan tidak menumpuk

---

## 11. Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| Halaman error setelah login | Skema belum dijalankan → ulangi langkah 2.2 |
| "Kamera tidak dapat diakses" | Harus `localhost` atau HTTPS. Di HP gunakan URL Vercel. Periksa juga izin kamera di pengaturan browser |
| Prompt izin kamera tidak muncul | Izin pernah diblokir. Chrome: ikon gembok di address bar → Site settings → Camera → Allow |
| QR tidak muncul di kiosk | Belum ada sesi yang terbuka (di luar jam kerja), atau *device secret* salah/kiosk dinonaktifkan |
| "Secret sudah terikat perangkat lain" | Satu secret hanya untuk satu perangkat. Admin → Kiosk → **Reset secret** |
| Foto profil gagal diunggah | Bucket `avatar` belum dibuat atau tidak Private (langkah 2.3) |
| Ekspor Sheets gagal | Spreadsheet belum di-*share* ke email service account sebagai Editor |
| Backup Drive `storageQuotaExceeded` | Masih memakai service account. Drive **harus** OAuth (bagian 9.2) |
| Notifikasi tidak muncul | Butuh HTTPS + aplikasi dipasang ke layar utama; iOS wajib "Tambahkan ke Layar Utama" |
| Cron ditolak saat deploy | Paket Hobby maksimal 1×/hari per cron — jangan ubah jadwal jadi lebih sering |

---

## Ringkasan environment variables

| Variabel | Wajib | Sumber |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Settings → API (rahasia) |
| `QR_SIGNING_SECRET` | ✅ | dibuat sendiri (acak) |
| `CRON_SECRET` | ✅ | dibuat sendiri (acak) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | disarankan | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | disarankan | idem |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | opsional | Google Cloud service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | opsional | idem |
| `GOOGLE_SHEETS_REKAP_ID` | opsional | URL spreadsheet |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` | opsional | OAuth (bagian 9.2) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | opsional | Upstash → REST API |
