# Blueprint Sistem Presensi ASN Berbasis QR Dinamis + Face Recognition + Geofencing
### Dokumen Inti untuk Agentic AI Development — Pemerintah Kabupaten Kotabaru

> **Status dokumen:** v2.0 — direvisi Agustus 2026 sebagai *single source of truth* bagi AI agent (mis. Claude Code) maupun developer manusia yang akan membangun aplikasi ini dari nol.
> **Prinsip utama:** Zero-budget (100% free tier), kode terbuka di GitHub, deploy di Vercel, backend di Supabase, opsional integrasi Google Sheets/Drive API.
> **Cara pakai dokumen ini:** Setiap bagian ditulis agar bisa dieksekusi langsung — ada keputusan desain, skema data, algoritma, dan perintah instalasi. Jika Anda adalah AI agent yang mengerjakan proyek ini, kerjakan bagian per bagian sesuai urutan Bagian 12 (Roadmap) dan gunakan Bagian 4 (Skema Data) serta Bagian 5–6 (Logika Bisnis) sebagai spesifikasi teknis yang mengikat. **Bagian/paragraf bertanda `[REVISI v2]` atau `[BARU v2]` adalah perubahan dari draf v1 — jika ada isi v1 yang belum tertandai tapi bertentangan dengan bagian v2, v2 yang berlaku.**

> **Riwayat revisi:**
> - **v1.0** — desain awal: QR unik per-pegawai ditampilkan di HP pegawai, dipindai perangkat scanner petugas; device binding di HP pegawai; jam istirahat 13.00–13.30; belum ada status "tidak ada di kantor".
> - **v2.0** — arah dibalik: QR ditampilkan di **kiosk tetap kantor**, dipindai HP pegawai (device apa pun, tanpa device binding pegawai) setelah lolos face verification **server-side**; klaim token atomik dengan rotasi instan-saat-klaim; device binding dipindah ke kiosk; batas telat absen pagi diperjelas sampai 10:00 WITA (lewat itu = tidak masuk & sesi berikutnya terkunci); jam istirahat diperpanjang jadi 12.30–13.30; status baru `tidak_ada_di_kantor` untuk pola "keluyuran"; klarifikasi bahwa native app **tidak diperlukan** untuk alur utama karena bukti lokasi kini dari kedekatan fisik ke kiosk, bukan GPS HP pegawai.

---

## Daftar Isi

1. Ringkasan Eksekutif & Batasan Realistis
2. Riset & Studi Banding (regulasi jam kerja ASN, MASOOK, praktik anti-kecurangan 2026)
3. Keputusan Arsitektur & Stack Teknologi (Zero-Budget)
4. Skema Basis Data (ERD + SQL lengkap untuk Supabase/Postgres)
5. Logika Bisnis Inti — Jam Kerja, Rotasi QR Code, Perhitungan Keterlambatan
6. Modul Anti-Kecurangan — Face Recognition, Liveness, Anti Fake-GPS, Device Binding
7. Modul & Fitur Aplikasi per Peran Pengguna
8. Tampilan "Mirip Aplikasi Native Android" (PWA) — Panduan Implementasi
9. Panduan Setup Step-by-Step (perintah lengkap, dari nol sampai deploy)
10. Struktur Proyek & Konvensi Kode
11. Keamanan: Row Level Security, Rate Limiting, Audit Trail
12. Roadmap Pengembangan Bertahap (MVP → Full Feature)
13. Kepatuhan Data Pribadi (UU PDP) untuk Data Biometrik
14. Jawaban Langsung atas Pertanyaan Spesifik Anda
15. Referensi & Sumber Riset

---

## 1. Ringkasan Eksekutif & Batasan Realistis

Aplikasi yang direncanakan adalah **sistem presensi ASN/pegawai berbasis QR code dinamis (mirip skema OTP/Google Authenticator, tapi dalam bentuk QR)**, dikombinasikan dengan **face recognition**, **geofencing**, dan **deteksi fake GPS**, dengan **modul pengaturan jam kerja fleksibel** per instansi (Senin–Kamis vs Senin–Sabtu) dan **perhitungan otomatis potongan tunjangan kinerja berbasis keterlambatan**.

Sebelum masuk ke desain teknis, penting untuk menetapkan **ekspektasi yang jujur**, karena ini akan menentukan arsitektur anti-fraud:

- **Tidak ada sistem presensi — sekalipun berbayar seperti MASOOK — yang 100% anti-kecurangan.** Bahkan vendor yang mengklaim mampu mendeteksi USB debugging dan memblokir aplikasi face-swap tetap bisa ditembus oleh kombinasi *rooted device + Magisk module + virtual camera*, meskipun butuh usaha lebih besar. Tujuan realistis sistem ini bukan "mustahil dicurangi", melainkan **defense-in-depth**: menaikkan biaya/usaha kecurangan setinggi mungkin, mendeteksi anomali secara otomatis, dan meninggalkan jejak audit yang kuat untuk proses disiplin kepegawaian.
- **QR code yang berubah-ubah (mirip TOTP) menghentikan *screenshot sharing* dan *replay attack* jarak jauh**, tetapi **tidak menghentikan titip akun** (rekan kerja login di HP-nya sendiri lalu memindai QR kiosk). Untuk itu, lapisan **face recognition server-side** menjadi wajib, bukan opsional — ini dijelaskan detail di Bagian 6 dan dijawab langsung di Bagian 14. *(Update: sejak revisi v2, device binding dipindahkan ke perangkat kiosk kantor, bukan lagi ke HP pegawai — lihat Bagian 6.4.)*
- Karena seluruh stack memakai **free tier**, batasan kuota (database 500 MB, bandwidth, panggilan fungsi, kuota Google API) harus dipertimbangkan sejak desain skema data — dijelaskan di Bagian 3.

**Ruang lingkup MVP** (lihat roadmap Bagian 12) difokuskan pada: presensi QR dinamis + geofence + perhitungan telat/potongan otomatis + dashboard admin. **Face recognition dan deteksi lanjutan** ditempatkan sebagai fase 2 karena kompleksitas dan risiko akurasi/privasi yang lebih tinggi.

## 2. Riset & Studi Banding

### 2.1 Regulasi Jam Kerja ASN — Nasional vs Kotabaru (⚠️ perlu verifikasi lokal)

Riset terhadap sumber resmi menemukan **baseline nasional**: berdasarkan **Perpres No. 21 Tahun 2023** tentang Hari dan Jam Kerja Instansi Pemerintah dan **PermenPANRB No. 4 Tahun 2025**, jam kerja ASN ditetapkan **37 jam 30 menit/minggu** (Senin–Jumat), mulai sekitar **07.30–08.00**, dengan istirahat **60 menit (Senin–Kamis)** dan **90 menit (Jumat)**. Saat Ramadan, jam kerja diperpendek menjadi 32 jam 30 menit/minggu.

**Namun**, riset web tidak menemukan naskah resmi (Surat Edaran/Peraturan Bupati) Kotabaru yang secara spesifik menerbitkan **jam kerja baru era Bupati Muhammad Rusli (dilantik 20 Februari 2025, periode 2025–2029)** yang cocok persis dengan skema jam yang Anda sebutkan (07.15–07.45 pagi; istirahat 13.00–13.30; pulang 16.30–17.30 Senin–Kamis; Jumat pulang 11.00–12.00). Yang berhasil ditemukan hanya SE Nomor 800.1.6/369/SETDA (16 Maret 2026) tentang larangan live streaming ASN saat jam kerja — bukan SE/Perbup jam kerja.

**Tindakan wajib sebelum go-live:** minta salinan resmi **Peraturan Bupati / SE Bupati Kotabaru tentang Hari dan Jam Kerja terbaru** ke Bagian Organisasi Setda atau BKPSDM Kotabaru, lalu masukkan angka-angka resminya ke **modul pengaturan jam kerja (Bagian 5.1)** — jangan hardcode. Sebagai referensi pembanding, kabupaten lain (mis. Timor Tengah Selatan Perbup No. 33/2025, Buleleng Perbub No. 56/2025) juga baru menerbitkan Perbup jam kerja tersendiri di 2025–2026, jadi pola ini wajar dan kemungkinan besar Kotabaru punya regulasi serupa yang belum terindeks di pencarian publik/JDIH. Angka jam kerja yang Anda berikan tetap dipakai sebagai **default konfigurasi awal** di sistem karena Anda menyampaikannya sebagai pengguna internal yang mengetahui kondisi riil kantor.

### 2.2 Studi Banding: MASOOK (Telkom) dan implikasinya

MASOOK adalah aplikasi presensi biometrik dari anak usaha Telkom yang mengklaim: face recognition, blokir aplikasi face-swap, deteksi USB debugging aktif. Ini menunjukkan level teknis yang jadi acuan "kompetitor" bagi sistem yang akan dibangun:

| Kapabilitas MASOOK | Bisa ditiru gratis? | Catatan |
|---|---|---|
| Face recognition matching | **Ya** | `face-api.js` / MediaPipe Face Mesh (client-side, gratis, model TensorFlow.js) |
| Deteksi USB debugging | **Ya, sebagian** | `navigator` fingerprinting + WebAuthn attestation terbatas di web; deteksi penuh butuh app native (Android `Settings.Secure.ADB_ENABLED` via WebView bridge) |
| Blokir aplikasi face-swap/virtual camera | **Sulit di web murni** | Browser tidak bisa introspeksi kamera virtual sepenuhnya; mitigasi lewat *liveness challenge* + deteksi resolusi/frame-rate anomali |
| Anti fake-GPS | **Ya, sebagian** | `isMock`/`isFromMockProvider` API hanya tersedia di app native Android, **tidak tersedia di web biasa** — ini alasan kuat mempertimbangkan wrapper native (dibahas Bagian 3.3) |

Kesimpulan riset: **web app murni (PWA) punya keterbatasan struktural** dalam mendeteksi mock-location dan USB debugging dibanding app native Android, karena API tersebut memang tidak diekspos ke browser oleh desain Android. Ini bukan kegagalan implementasi, melainkan batas platform — dijelaskan solusinya di Bagian 3.3.

### 2.3 Praktik Terbaik Anti Fake-GPS (riset 2026)

Riset terhadap literatur teknis 2026 menyimpulkan pendekatan **defense-in-depth berlapis** (bukan satu jurus sakti):

1. **Layer OS-level** (hanya app native/TWA dengan akses `LocationManager`): cek `Location.isMock()` (API 31+) / `isFromMockProvider()` (API lama).
2. **Layer sensor-fusion**: bandingkan GPS dengan sinyal Wi-Fi/seluler sekitar; kecepatan mustahil (mis. berpindah 5 km dalam 10 detik) ditandai anomali.
3. **Layer server-side**: cross-check riwayat lokasi, pola waktu tempuh, radius geofence yang **tidak terlalu presisi** (mis. radius 75–150 m, bukan 5 m, agar toleran GPS drift alami tapi tetap membatasi).
4. **Layer akun/perangkat**: root/jailbreak detection dasar, device fingerprint terikat ke 1 pegawai (Bagian 6.4).
5. **Layer manusia**: anomali di-flag otomatis ke HR untuk verifikasi manual — bukan auto-block keras, supaya tidak ada false-positive yang merugikan pegawai jujur (GPS drift adalah hal umum di area perkotaan padat/gedung tinggi).

Riset juga mengonfirmasi apa yang Anda sampaikan: **rooted device + Magisk module (mis. "Play Integrity Fix") bisa menyembunyikan status mock-location**, sehingga tidak ada solusi tunggal yang mustahil ditembus — ini konsisten dengan prinsip *raise the cost, don't promise perfection* pada Bagian 1.

### 2.4 Praktik Terbaik Face Recognition & Liveness (riset 2026)

- **Face matching** (membandingkan wajah dengan wajah terdaftar) — teknologinya matang dan **bisa** diimplementasikan gratis di browser via `face-api.js` (TensorFlow.js) atau model ONNX open-source, dengan akurasi cukup baik untuk kasus 1:1 verification (bukan 1:N pencarian database besar).
- **Liveness detection** (membedakan wajah asli vs foto/video/deepfake) adalah **jauh lebih sulit** dan inilah yang membedakan vendor mahal (mis. iBeta Level 2 certified) dari solusi gratis. Solusi open-source (mis. `FaceRecognition-LivenessDetection-Javascript` di GitHub) ada, tapi akurasinya belum tersertifikasi sekelas produk komersial.
- **Pendekatan realistis untuk zero-budget:** kombinasikan **active liveness challenge** (pegawai diminta berkedip / menoleh / senyum sesuai instruksi acak on-screen, dideteksi via MediaPipe Face Mesh landmark movement) dengan **passive check sederhana** (deteksi tepi foto/bingkai layar HP lain, tekstur, refleksi) — ini menaikkan biaya pemalsuan tanpa butuh SDK berbayar.

## 3. Keputusan Arsitektur & Stack Teknologi (Zero-Budget)

### 3.1 Stack Utama (sesuai preferensi Anda)

| Layer | Teknologi | Alasan |
|---|---|---|
| Version control & CI | **GitHub** (repo publik/privat gratis) + **GitHub Actions** (2.000 menit/bulan gratis utk repo privat, unlimited utk repo publik) | Standar industri, terintegrasi native dengan Vercel |
| Hosting frontend & API routes | **Vercel (Hobby plan)** | Deploy otomatis dari GitHub, gratis, cocok Next.js |
| Framework | **Next.js 15 (App Router)** + TypeScript | SSR/ISR, API routes built-in, PWA-friendly |
| Backend/Database | **Supabase (Free tier)**: Postgres 500 MB, Auth, Storage 1 GB, Realtime, Edge Functions | Auth bawaan, Realtime penting untuk update status QR live, Row Level Security untuk multi-instansi |
| Styling | Tailwind CSS + shadcn/ui (gratis, open-source) | Untuk mencapai tampilan "native Android" (Bagian 8) |
| Integrasi opsional | **Google Sheets API** (ekspor rekap/laporan), **Google Drive API** (backup file, dokumen SK), **Google OAuth** (opsional SSO) | Sesuai familiaritas Anda; **bukan** database utama (lihat 3.2) |
| Face recognition | `face-api.js` / `@vladmandic/face-api` (client-side, model TF.js, gratis) | Jalan di browser, tidak butuh server GPU |
| QR generation/scan | `qrcode` (generate) + `html5-qrcode` atau `zxing-js` (scan di sisi perangkat server/absensi) | Open-source, gratis |
| Push notification | Web Push API + VAPID keys (gratis, built-in browser) | Tidak butuh Firebase berbayar |
| Monitoring error | Sentry (free tier 5k events/bulan) atau Vercel built-in logs | Opsional |

### 3.2 Kenapa Google Sheets/Drive API **bukan** database utama

Ini adalah keputusan arsitektur penting yang perlu dipahami agen AI yang mengerjakan proyek: Google Sheets API dibatasi **~300 read request/menit/project** dan **~60 write request/menit/user/project** (kuota berlaku per menit, direfill tiap menit, tanpa batas harian). Untuk skema **QR yang berganti tiap 1 menit dan harus disinkronkan real-time antara HP pegawai dan perangkat scanner**, latensi dan rate-limit Sheets API **tidak cocok** sebagai sumber kebenaran (source of truth). Solusi:

- **Supabase Postgres + Realtime** = source of truth untuk seluruh data operasional (token QR, presensi, jadwal, pegawai).
- **Google Sheets API** dipakai sebagai **lapisan sekunder**: (a) job terjadwal (GitHub Actions cron / Supabase Edge Function cron) yang mengekspor rekap presensi harian/bulanan ke Google Sheets untuk laporan yang biasa dipakai BKPSDM, (b) opsional impor data master pegawai dari Sheet yang sudah ada.
- **Google Drive API** dipakai untuk **backup terjadwal** (dump SQL harian) dan penyimpanan dokumen pendukung (SK, surat keterangan) — sekaligus menjadi *mitigasi* atas tidak adanya fitur backup otomatis di Supabase free tier.

### 3.3 [Update v2] Web App vs App Native — PWA Cukup untuk Alur Utama

Anda menyebutkan terbuka pada opsi non-web-app. Setelah revisi alur (Bagian 5.2, 6.5 — lokasi dibuktikan lewat kedekatan fisik memindai QR kiosk, bukan GPS self-report HP pegawai), kebutuhan native app di sisi pegawai **berkurang signifikan** dibanding asumsi awal:

- **PWA (Progressive Web App) berbasis Next.js sudah cukup untuk seluruh alur utama** — instalable di homescreen Android, tampil fullscreen tanpa address bar, terasa seperti app native (detail Bagian 8), mendukung kamera untuk face-check maupun scan QR tanpa perlu akses `isMock`/GPS OS-level sama sekali.
- **Native/TWA (via Bubblewrap atau Capacitor) baru relevan untuk 2 skenario opsional**, bukan alur utama: (1) mengeraskan **kiosk** ke mode kios terkunci (Bagian 5.2c) — meski ini pun bisa dicapai lewat app kiosk gratis seperti "Fully Kiosk Browser" tanpa menulis native code sendiri; (2) jika ke depan ditambahkan **mode presensi jarak jauh** (dinas luar/WFA) yang mengandalkan GPS self-report HP pegawai (Bagian 6.5 revisi) — barulah deteksi `isMock`/root tingkat OS jadi relevan.
- **Tidak perlu memilih native di awal** — PWA-first sudah menuntaskan kebutuhan inti, native/TWA disiapkan sebagai jalur peningkatan kapan pun dibutuhkan tanpa menulis ulang UI.

### 3.4 Tabel Batas Free Tier yang Wajib Dipantau

| Layanan | Batas gratis (2026) | Risiko saat skala Kotabaru (~ribuan ASN) | Mitigasi |
|---|---|---|---|
| Supabase DB | 500 MB storage, shared CPU/RAM | Tabel presensi tumbuh cepat jika logging detail (foto, log GPS) | Simpan foto presensi terkompresi di **Supabase Storage** (1 GB, terpisah dari kuota DB), retensi log mentah 90 hari lalu diarsipkan ke Google Drive |
| Supabase egress | 5 GB/bulan | Streaming foto/kamera bisa boros | Kompresi gambar (WebP, resize ke ≤200 KB) sebelum upload |
| Supabase realtime | 200 koneksi bersamaan, 2 juta pesan/bulan | Ratusan pegawai membuka halaman absensi bersamaan saat jam masuk | Gunakan polling fallback tiap 5–10 detik sebagai cadangan, bukan hanya websocket |
| Supabase project pause | Pause otomatis setelah 7 hari tanpa aktivitas | Tidak masalah untuk app produksi (selalu ada trafik harian) | Tambahkan cron ping harian sebagai jaga-jaga |
| Vercel bandwidth | 100 GB/bulan | Aman untuk ribuan pegawai kalau aset dioptimasi | Aktifkan Next.js Image Optimization, cache static asset |
| Vercel functions | ±100.000–1 juta invocation/bulan (tergantung compute) | Endpoint verifikasi QR dipanggil intensif saat jam sibuk | Pindahkan proses berat (matching wajah) ke client-side, bukan server |
| **Vercel — penggunaan komersial** | Hobby plan **melarang "commercial use"** (definisi Vercel cukup luas) | App pemerintah internal biasanya masuk kategori *internal tool non-revenue*, tapi ambigu | Baca `vercel.com/docs/limits/fair-use-policy`; jika ragu, pertimbangkan Vercel Pro (masih terjangkau via anggaran instansi) atau alternatif gratis-komersial seperti **Cloudflare Pages** (unlimited bandwidth, mendukung Next.js) sebagai fallback |
| Google Sheets/Drive API | 300 read/menit, ~60 write/menit/user | Aman selama dipakai untuk ekspor batch, bukan transaksi real-time | Jadwalkan ekspor per 15–30 menit, bukan per-scan |

## 4. Skema Basis Data (Supabase/Postgres)

### 4.1 Ringkasan Entitas (ERD naratif)

```
instansi (1) ──< unit_kerja (1) ──< pegawai
pegawai (1) ──< pegawai_face_enrollment
instansi (1) ──< unit_kerja (1) ──< perangkat_kiosk  [BARU v2 — device binding pindah ke sini]
instansi (1) ──< pola_hari_kerja (Senin-Kamis / Senin-Sabtu, dst)
instansi (1) ──< jam_kerja_sesi (pagi/istirahat/pulang, per pola_hari_kerja, per hari)
jam_kerja_sesi (1) ──< sesi_absensi_harian (instance harian: dibuka/ditutup sistem)
perangkat_kiosk (1) ──< qr_token (banyak token, rotasi instan-saat-klaim / fallback 1 menit) [v2]
sesi_absensi_harian (1) ──< presensi (1 per pegawai per sesi)
presensi (1) ──< presensi_verifikasi_log (jejak audit: wajah, kiosk, skor anomali)
instansi (1) ──< pengaturan_potongan (aturan potongan tunjangan berjenjang)
```

### 4.2 DDL SQL Lengkap

```sql
-- =========================================================
-- 0. EXTENSIONS
-- =========================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================================================
-- 1. INSTANSI & UNIT KERJA (multi-tenant agar bisa dipakai
--    kabupaten lain / instansi swasta lain di masa depan)
-- =========================================================
create table instansi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode text unique not null,          -- mis. 'PEMKAB-KOTABARU'
  radius_geofence_meter int not null default 100,
  latitude numeric(10,7),
  longitude numeric(10,7),
  timezone text not null default 'Asia/Makassar', -- WITA
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table unit_kerja (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id) on delete cascade,
  nama text not null,             -- mis. 'Unit Metrologi Legal'
  latitude numeric(10,7),         -- override lokasi jika unit kerja punya kantor terpisah
  longitude numeric(10,7),
  radius_geofence_meter int,      -- override radius jika berbeda dari instansi induk
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. PEGAWAI
-- =========================================================
create table pegawai (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  instansi_id uuid not null references instansi(id),
  unit_kerja_id uuid not null references unit_kerja(id),
  nip text unique,
  nama text not null,
  jabatan text,
  pola_hari_kerja_id uuid not null references pola_hari_kerja(id),
  status_kepegawaian text not null default 'aktif' check (status_kepegawaian in ('aktif','cuti','nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 3. POLA HARI KERJA (modul setting: Senin-Kamis vs Senin-Sabtu)
-- =========================================================
create table pola_hari_kerja (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id),
  nama text not null,               -- 'Senin-Jumat', 'Senin-Sabtu'
  hari_aktif int[] not null,        -- 1=Minggu..7=Sabtu (ISO-like custom); default [2,3,4,5,6] atau [2,3,4,5,6,7]
  created_at timestamptz not null default now()
);

alter table pegawai
  add constraint fk_pola_hari_kerja
  foreign key (pola_hari_kerja_id) references pola_hari_kerja(id);

-- =========================================================
-- 4. JAM KERJA SESI (modul setting jam: pagi/istirahat/pulang,
--    berbeda per hari dalam minggu, editable via UI admin)
-- =========================================================
create table jam_kerja_sesi (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id),
  pola_hari_kerja_id uuid not null references pola_hari_kerja(id),
  hari int not null,                -- 1=Minggu..7=Sabtu
  jenis_sesi text not null check (jenis_sesi in ('masuk','istirahat','pulang')),
  jam_buka time not null,           -- mis. 07:15
  jam_tutup time not null,          -- mis. 07:45 (batas akhir tidak dianggap alpa/pulang cepat)
  jam_batas_akhir time,             -- [BARU v2] sesi masuk: batas mutlak absen (mis. 10:00) -> lewat ini = tidak_hadir & kunci sesi berikutnya
  jam_wajar_akhir time,             -- untuk sesi pulang: batas akhir dianggap "pulang cepat" jika absen sebelum ini
  mode_sebelum_jendela text default 'blokir' check (mode_sebelum_jendela in ('blokir','izinkan_dengan_status')),
  mode_setelah_jendela text default 'izinkan_dengan_status' check (mode_setelah_jendela in ('blokir','izinkan_dengan_status')),
  urutan int not null default 1,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (instansi_id, pola_hari_kerja_id, hari, jenis_sesi)
);
-- Catatan pengisian sesuai kebutuhan terbaru Anda (default seed, EDITABLE via UI, v2):
--  Senin-Kamis: masuk 07:15-07:45 (batas akhir 10:00) | istirahat 12:30-13:30 | pulang 16:30-17:30
--  Jumat:       masuk 07:15-07:45 (batas akhir 10:00) | (tanpa istirahat)      | pulang 11:00-12:00
--  Sabtu (pola Senin-Sabtu saja): masuk & istirahat sama seperti Jumat | pulang 12:00-13:00
-- ⚠️ Masih menunggu SK resmi jam kerja ASN Kotabaru -- perbarui begitu diperoleh (Bagian 2.1).

-- =========================================================
-- 5. SESI ABSENSI HARIAN (instance nyata per tanggal, dibuat
--    otomatis oleh scheduler saat jam_buka tiba)
-- =========================================================
create table sesi_absensi_harian (
  id uuid primary key default gen_random_uuid(),
  jam_kerja_sesi_id uuid not null references jam_kerja_sesi(id),
  instansi_id uuid not null references instansi(id),
  tanggal date not null,
  status text not null default 'terjadwal' check (status in ('terjadwal','dibuka','ditutup')),
  dibuka_at timestamptz,
  ditutup_at timestamptz,
  created_at timestamptz not null default now(),
  unique (jam_kerja_sesi_id, tanggal)
);

-- =========================================================
-- 6. [REVISI v2] PERANGKAT KIOSK (device tetap kantor yang
--    menampilkan QR — lihat Bagian 5.2c)
-- =========================================================
create table perangkat_kiosk (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id),
  unit_kerja_id uuid references unit_kerja(id),
  nama_perangkat text not null,
  device_secret_hash text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  aktif boolean not null default true,
  terakhir_online timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 7. [REVISI v2] QR TOKEN — sekarang milik KIOSK, bukan pegawai.
--    Diklaim (bukan langsung 'used') saat pertama discan, baru
--    final setelah pipeline verifikasi lanjutan lolos (5.2).
-- =========================================================
create table qr_token (
  id uuid primary key default gen_random_uuid(),
  sesi_absensi_harian_id uuid not null references sesi_absensi_harian(id) on delete cascade,
  perangkat_kiosk_id uuid not null references perangkat_kiosk(id),  -- token milik KIOSK (5.2 revisi)
  token_value text not null unique,
  nonce text not null,
  status text not null default 'aktif' check (status in ('aktif','diklaim','digunakan','gagal','kedaluwarsa')),
  diklaim_oleh_pegawai_id uuid references pegawai(id),
  diklaim_at timestamptz,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null    -- issued_at + 2 menit
);
create index idx_qr_token_lookup on qr_token (token_value) where status = 'aktif';
create index idx_qr_token_kiosk_sesi on qr_token (perangkat_kiosk_id, sesi_absensi_harian_id);

-- =========================================================
-- 8. [REVISI v2] PRESENSI — tambah status 'tidak_ada_di_kantor',
--    tambah referensi ke kiosk tempat scan terjadi
-- =========================================================
create table presensi (
  id uuid primary key default gen_random_uuid(),
  sesi_absensi_harian_id uuid not null references sesi_absensi_harian(id),
  pegawai_id uuid not null references pegawai(id),
  perangkat_kiosk_id uuid references perangkat_kiosk(id),  -- [BARU v2] kiosk tempat scan terjadi
  waktu_absen timestamptz not null default now(),
  status text not null check (status in ('tepat_waktu','terlambat','pulang_cepat','tidak_hadir','tidak_ada_di_kantor','ditolak_lokasi','ditolak_wajah','ditolak_di_luar_jendela')),
  menit_keterlambatan int not null default 0,
  skor_kecocokan_wajah numeric(5,4),   -- 0..1, cosine similarity, dihitung SERVER-SIDE (Bagian 6.2 revisi)
  skor_liveness numeric(5,4),
  ip_address inet,
  catatan text,
  created_at timestamptz not null default now(),
  unique (sesi_absensi_harian_id, pegawai_id)
);
-- Catatan: kolom latitude/longitude/jarak_dari_kantor_meter milik HP pegawai DIHAPUS dari
-- v1 -- lokasi kini dibuktikan lewat perangkat_kiosk_id (lokasi tetap kantor), bukan GPS
-- self-report HP pegawai (lihat Bagian 6.5 revisi). device_id HP pegawai tidak lagi
-- disimpan sebagai bukti identitas (device binding pegawai dihapus, Bagian 6.4 revisi).

-- =========================================================
-- 8. VERIFIKASI LOG (audit trail granular, untuk investigasi
--    kecurangan & dasar keputusan disiplin)
-- =========================================================
create table presensi_verifikasi_log (
  id uuid primary key default gen_random_uuid(),
  presensi_id uuid references presensi(id),
  pegawai_id uuid not null references pegawai(id),
  tipe_event text not null,   -- 'qr_scan_attempt','face_match','gps_check','device_check','anomaly_flag'
  hasil text not null,        -- 'sukses','gagal','dicurigai'
  detail jsonb,               -- payload bebas: skor, alasan, raw sensor data
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9. FACE ENROLLMENT (embedding wajah, bukan foto mentah
--    di DB — foto asli di Storage dengan akses terbatas)
-- =========================================================
create table pegawai_face_enrollment (
  id uuid primary key default gen_random_uuid(),
  pegawai_id uuid not null references pegawai(id) unique,
  face_embedding vector(128),   -- butuh extension pgvector; fallback: float8[] jika tak tersedia
  foto_storage_path text,       -- path di Supabase Storage (bucket privat)
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references pegawai(id)
);

-- =========================================================
-- 10. [DIHAPUS di v2] Device binding untuk HP PEGAWAI tidak lagi
--     dipakai -- pegawai boleh pakai HP apa pun asal login akun
--     sendiri + lolos face recognition server-side (Bagian 6.2, 6.4
--     revisi). Device binding v2 hanya berlaku untuk KIOSK, lihat
--     tabel `perangkat_kiosk` di atas (poin 6).

-- =========================================================
-- 11. PENGATURAN POTONGAN TUNJANGAN (berjenjang, editable)
-- =========================================================
create table pengaturan_potongan (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id),
  jenis text not null check (jenis in ('terlambat','pulang_cepat','tidak_hadir')),
  menit_dari int not null,     -- batas bawah rentang menit (inklusif)
  menit_sampai int,            -- batas atas rentang menit (null = tak terhingga)
  persen_potongan numeric(5,2) not null,  -- mis. 0.5 = 0.5% dari tunjangan kinerja
  created_at timestamptz not null default now()
);
-- Contoh seed (silakan sesuaikan dengan aturan TPP/TKD Kotabaru yang berlaku):
-- terlambat 1-30 menit    -> potongan 0.5%
-- terlambat 31-60 menit   -> potongan 1%
-- terlambat 61-90 menit   -> potongan 1.25%
-- terlambat >90 menit     -> dihitung setara 1/2 hari tidak masuk
-- tidak absen masuk & pulang tanpa keterangan -> dihitung alpa 1 hari penuh

-- =========================================================
-- 12. INDEXES tambahan untuk performa query laporan
-- =========================================================
create index idx_presensi_tanggal on presensi (sesi_absensi_harian_id, pegawai_id);
create index idx_pegawai_unit on pegawai (unit_kerja_id, status_kepegawaian);
```

> **Catatan implementasi `pegawai_face_enrollment.face_embedding`:** jika Supabase project tidak mengaktifkan extension `pgvector`, gunakan tipe `float8[]` sebagai fallback dan hitung cosine similarity di aplikasi (JS), bukan di query SQL. `pgvector` tersedia gratis di Supabase (tinggal `create extension vector;`) sehingga direkomendasikan diaktifkan sejak awal untuk mempermudah query kemiripan (`<->` operator).

## 5. Logika Bisnis Inti

### 5.1 Modul Pengaturan Jam Kerja & Hari Kerja

Wajib berupa **UI admin (bukan hardcode)** yang memetakan langsung ke tabel `pola_hari_kerja` dan `jam_kerja_sesi` (Bagian 4.2):

- **Halaman "Pola Hari Kerja"**: admin buat/edit pola (mis. "Senin–Jumat", "Senin–Sabtu"), pilih hari aktif via checkbox 7 hari.
- **Halaman "Jam Sesi per Pola"**: untuk tiap pola × hari × jenis sesi (masuk/istirahat/pulang), admin isi `jam_buka`, `jam_tutup` via time-picker. Sistem otomatis generate baris untuk hari-hari yang jamnya identik (mis. copy Jumat ke Sabtu sebagai starting point, lalu admin edit jika beda).
- **Halaman "Penugasan Pegawai"**: assign tiap pegawai ke `pola_hari_kerja_id` (dropdown per pegawai atau bulk-assign per unit kerja).
- Perubahan jam kerja **tidak retroaktif** — sistem selalu memakai `jam_kerja_sesi` yang berlaku pada `sesi_absensi_harian.tanggal`, sehingga histori presensi lama tidak berubah walau aturan direvisi (penting untuk kasus SE Bupati berubah sewaktu-waktu seperti disebutkan di Bagian 2.1).

Default seed data (silakan sesuaikan setelah verifikasi regulasi resmi — Bagian 2.1):

```
Pola "Senin-Jumat" & "Senin-Sabtu" (masuk & istirahat sama untuk kedua pola):
  Senin-Kamis : masuk 07:15-07:45 | istirahat 13:00-13:30 | pulang 16:30-17:30
  Jumat       : masuk 07:15-07:45 | (tanpa istirahat)      | pulang 11:00-12:00
  Sabtu (khusus pola "Senin-Sabtu") : masuk 07:15-07:45 | istirahat 13:00-13:30 | pulang 12:00-13:00
```

### 5.2 [REVISI v2] Skema Rotasi QR Code — Kiosk Menampilkan, HP Pegawai Memindai

> **Perubahan arah alur (v2):** Berdasarkan revisi, arah scan **dibalik** dari desain v1. Sekarang: **kiosk (perangkat tetap di kantor) yang menampilkan QR berputar**, dan **HP pegawai (perangkat apa pun, tidak perlu device binding) yang memindainya**, setelah pegawai login ke akunnya sendiri dan lolos verifikasi wajah. Ini menyelesaikan masalah "HP ketinggalan/rusak/kuota habis" sekaligus membuat bukti lokasi lebih kuat (lihat Bagian 6.5 revisi).

**Alur end-to-end:**

1. Pegawai membuka app di HP **apa pun** → login ke akunnya (Supabase Auth).
2. Saat jendela sesi absensi terbuka, tombol "Mulai Absensi" muncul. Pegawai tekan → kamera HP aktif → **verifikasi wajah dulu** (capture wajah, hitung face descriptor di HP, kirim descriptor ke server).
3. **Server** (bukan HP) menghitung cosine similarity descriptor tsb terhadap `face_embedding` tersimpan milik akun yang sedang login → jika lolos threshold, server terbitkan **`face_session_token`** (token pendek berumur ±90 detik, ditandatangani server, membuktikan "pegawai X baru saja lolos verifikasi wajah") dan kembalikan ke HP. *(Prinsip wajib: HP tidak pernah mengirim "lulus/tidak" sebagai klaim yang dipercaya mentah-mentah — server yang memutuskan, lihat Bagian 6.2 revisi.)*
4. Baru setelah punya `face_session_token` valid, **menu pemindai QR terbuka** di HP pegawai. Pegawai arahkan kamera HP ke QR yang tampil di **kiosk kantor**.
5. HP kirim `{token_value_dari_kiosk, face_session_token}` ke endpoint `POST /api/presensi/verify`.
6. **Server memverifikasi secara atomik** (lihat mekanisme klaim di bawah) → jika semua valid, `presensi` tersimpan, kiosk langsung diberi sinyal (Realtime) untuk **rotasi QR seketika**.

**Generate token oleh kiosk (bukan per-pegawai lagi):**
```
payload = { device_id (id kiosk), sesi_id, nonce = random(16 bytes), issued_at }
signature = HMAC_SHA256(secret_key_instansi, payload)
token_value = base64url(payload) + "." + signature
expires_at = issued_at + 2 menit
```
Karena `nonce` acak 128-bit, **tidak ada kebutuhan mengoordinasikan token antar-kiosk** — setiap kiosk generate token-nya sendiri secara independen, kapan pun perlu, tanpa risiko tabrakan dengan kiosk lain (lihat Bagian 5.2b soal skalabilitas multi-kiosk).

**Mekanisme klaim atomik & rotasi instan (menjawab kekhawatiran "sinkronisasi & race condition" Anda):**

Ini **tidak perlu dibangun sebagai antrean manual** — cukup manfaatkan atomicity bawaan Postgres:
```sql
-- Baris ini otomatis mengunci row selama transaksi; kalau 2 request datang
-- nyaris bersamaan untuk token_value yang sama, hanya SATU yang dapat baris
-- ter-update (< 10ms), yang kedua dapat 0 baris -> instan ditolak.
UPDATE qr_token
SET status = 'diklaim', diklaim_oleh_pegawai_id = $pegawai_id, diklaim_at = now()
WHERE token_value = $token_value AND status = 'aktif' AND expires_at > now()
RETURNING id;
```
- Jika `RETURNING` mengembalikan 0 baris → pegawai kedua (atau siapa pun yang telat) langsung mendapat respons "Kode sudah digunakan/kedaluwarsa, silakan pindai kode yang baru" — **bukan menunggu**, hanya kalah pada satu query atomik yang berjalan sub-detik.
- **Begitu klaim berhasil**, server langsung publish event Realtime ke channel kiosk terkait → **kiosk rotasi QR seketika**, tidak menunggu genap 1 menit. Timer 1 menit hanya jadi *fallback*: kalau selama 1 menit tidak ada yang berhasil klaim sama sekali, kiosk tetap rotasi untuk alasan keamanan (mengurangi jendela waktu QR bisa difoto/disebar).
- Setelah token diklaim, lanjutkan pipeline verifikasi (cek `face_session_token` valid & belum kedaluwarsa, cek belum ada baris `presensi` untuk pegawai+sesi ini). **Jika verifikasi lanjutan gagal** (mis. `face_session_token` sudah expired), token **tidak dikembalikan ke status `'aktif'`** — tandai `'gagal'` dan biarkan kiosk sudah rotasi ke kode baru; pegawai mengulang dari kode yang sedang tampil saat itu (dengan rate-limit percobaan gagal beruntun, lihat Bagian 11.2).
- **Kenapa rotasi-instan-saat-klaim penting untuk throughput:** jika rotasi hanya terjadi tiap 1 menit tetap, 1 kiosk cuma sanggup melayani ±1 orang/menit — untuk kantor ber-ratusan pegawai dalam jendela 30 menit, ini bisa jadi bottleneck serius. Dengan rotasi instan (siklus realistis 2–5 detik per orang), throughput 1 kiosk naik ke puluhan-ratusan orang per jendela absensi. 2 kiosk per kantor (seperti yang Anda usulkan) jadi penambah kapasitas + redundansi jika 1 unit bermasalah, bukan sekadar syarat teknis.

### 5.2b Skalabilitas Multi-Kiosk / Multi-Instansi — Kenapa "Pool 10.000 QR" Tidak Diperlukan

Skenario yang Anda gambarkan (100 kiosk × 100 QR unik masing-masing = 10.000 QR pra-dialokasikan, tidak boleh tumpang tindih antar-kiosk) **secara fungsional tidak diperlukan**, dan menambahkan kompleksitas yang tidak memberi manfaat keamanan tambahan. Alasannya:

- Uniqueness token **tidak bergantung pada koordinasi antar-device**, melainkan pada **nonce acak 128-bit per token**. Peluang dua kiosk (atau kiosk yang sama di dua waktu berbeda) menghasilkan nonce identik secara praktis nol — jauh lebih kecil dari risiko kegagalan hardware. Ini setara dengan alasan UUID v4 aman dipakai sebagai primary key tanpa perlu "daftar pusat UUID yang sudah dipakai".
- Karena tidak ada ketergantungan antar-device, **menambah kiosk ke-101 tidak butuh realokasi apa pun** — cukup daftarkan `device_id` baru di tabel `perangkat_kiosk` (Bagian 5.2c), kiosk itu langsung bisa generate token sendiri sejak detik pertama.
- Beban database pun ringan: 100 kiosk × rotasi tiap ±5 detik saat jam sibuk = puluhan ribu INSERT/UPDATE per hari — jauh di bawah kapasitas Postgres 500 MB gratis Supabase (baris `qr_token` kecil, dan bisa di-purge otomatis tiap malam via cron karena hanya relevan sesaat).
- **Rekomendasi:** hapus konsep "pool/alokasi QR" dari desain. Setiap kiosk = 1 generator token independen. Sistem otomatis scalable ke berapa pun jumlah kiosk/instansi tanpa perubahan arsitektur.

### 5.2c Registrasi & Device Binding untuk Kiosk (bukan HP Pegawai)

Ini justru penerapan device binding yang tepat sasaran — kiosk adalah **aset kantor**, bukan barang pribadi yang berpindah tangan:

```sql
create table perangkat_kiosk (
  id uuid primary key default gen_random_uuid(),
  instansi_id uuid not null references instansi(id),
  unit_kerja_id uuid references unit_kerja(id),
  nama_perangkat text not null,          -- mis. 'Kiosk Lobi 1 - Unit Metrologi'
  device_secret_hash text not null,      -- hash dari secret yang disimpan di kiosk
  latitude numeric(10,7) not null,       -- lokasi tetap, diisi manual admin saat registrasi
  longitude numeric(10,7) not null,
  aktif boolean not null default true,
  terakhir_online timestamptz,
  created_at timestamptz not null default now()
);
```
- Saat admin mendaftarkan kiosk baru: sistem generate `device_secret` acak panjang, ditampilkan **sekali** untuk disalin ke kiosk (disimpan di `localStorage`/IndexedDB kiosk), sementara server hanya menyimpan hash-nya.
- Setiap request generate-token dari kiosk wajib menyertakan `device_secret`; server tolak jika tidak cocok/kiosk nonaktif.
- **Tidak perlu app native untuk kiosk** — karena lokasi kiosk sudah tetap (diisi manual admin, bukan self-report GPS real-time), PWA yang berjalan di tablet/Android box dalam **mode kios** (pakai app kiosk gratis seperti "Fully Kiosk Browser", atau MDM sederhana yang mengunci layar ke 1 app) sudah memadai. Native/Capacitor untuk kiosk hanya perlu dipertimbangkan jika ke depan ingin menambah pengecekan GPS real-time kiosk sebagai lapisan tambahan (mendeteksi kiosk yang dicabut & dipindah) — opsional, bukan prasyarat.

### 5.3 [REVISI v2] Aturan Jendela Waktu & Status Presensi (state machine)

> **Catatan status regulasi:** Anda masih mencari SK resmi jam kerja ASN Kotabaru terbaru. Angka-angka di bawah (batas telat 10:00, istirahat 12:30–13:30) adalah update dari Anda dan tetap diperlakukan sebagai **data konfigurasi**, bukan hardcode — begitu SK resmi diperoleh, tinggal disesuaikan lewat modul "Jam Sesi per Pola" (Bagian 5.1), tanpa mengubah kode.

Untuk setiap `jenis_sesi`, sistem mengevaluasi waktu scan terhadap `jam_buka`, `jam_tutup`, dan `jam_batas_akhir`:

**Sesi Masuk (mis. 07:15–07:45, batas akhir 10:00 WITA):**
- Scan sebelum `jam_buka` (07:15) → **ditolak otomatis**, kiosk belum generate QR untuk sesi ini.
- Scan antara `jam_buka`–`jam_tutup` (07:15–07:45) → `status='tepat_waktu'`, `menit_keterlambatan=0`.
- Scan setelah `jam_tutup` sampai `jam_batas_akhir` (07:45–10:00) → `status='terlambat'`, `menit_keterlambatan = waktu_absen - jam_tutup`, dipakai untuk hitung potongan (Bagian 5.4).
- **Setelah `jam_batas_akhir` (lewat 10:00)** → kiosk **berhenti generate QR untuk sesi masuk**; pegawai yang belum absen otomatis `status='tidak_hadir'` untuk hari itu (di-generate job penutupan sesi pukul 10:00), **dan otomatis tidak berhak** membuka sesi istirahat maupun sesi pulang hari itu (lihat aturan di bawah).
- Kiosk **dibuka lagi** untuk sesi berikutnya (istirahat) sesuai jadwalnya masing-masing.

**Sesi Istirahat (mis. 12:30–13:30, khusus Senin–Kamis, diperpanjang dari revisi sebelumnya):**
- Prasyarat: hanya berlaku untuk pegawai yang **sesi masuknya berhasil** (`status` bukan `tidak_hadir`); jika sesi masuk gagal, tombol absen istirahat/pulang tidak muncul sama sekali hari itu.
- Tidak absen sama sekali dalam window (12:30–13:30) → `status='tidak_ada_di_kantor'` **(status baru, revisi)** — bukan lagi `'tidak_hadir'`, karena pegawai sudah terbukti masuk pagi; ini murni penanda "tidak terpantau di kantor saat jam istirahat", dipakai sebagai sinyal pola bagi admin/BKPSDM (lihat catatan di bawah).
- Absen dalam window → `status='tepat_waktu'`.

**Sesi Pulang (mis. 16:30–17:30):**
- Absen sebelum `jam_buka` (16:30) → **diizinkan** (tombol tetap muncul) tapi dicap `status='pulang_cepat'`.
- Absen dalam jendela 16:30–17:30 → `status='tepat_waktu'`.
- **Tidak absen sama sekali** dalam window → `status='tidak_ada_di_kantor'` **(bukan `'tidak_hadir'` — sama seperti sesi istirahat, karena sesi masuk sudah berhasil)**.
- Setelah 17:30 → tombol absen pulang **hilang/diblokir total**, tidak bisa absen pulang lagi.

Aturan yang sama berlaku (jam berbeda) untuk Jumat (pulang 11:00–12:00, tanpa sesi istirahat) dan Sabtu bagi instansi berpola Senin–Sabtu (pulang 12:00–13:00).

> **Kegunaan status `'tidak_ada_di_kantor'` bagi kepegawaian:** ini secara eksplisit **bukan** sinonim `'pulang_cepat'` atau `'tidak_hadir'` — statusnya murni sinyal "pegawai absen pagi lalu tidak lagi terpantau saat istirahat/pulang hari itu", memungkinkan admin dinas & BKPSDM memantau **pola berulang** (mis. laporan bulanan: "Pegawai X mendapat status `tidak_ada_di_kantor` 8 dari 22 hari kerja" → indikasi tidak tertib absensi / sering keluar tanpa keterangan) tanpa harus menuduh pulang cepat/alpa secara langsung per kejadian — keputusan disiplin tetap di tangan manusia berdasar pola, bukan otomatis per kejadian tunggal.

> **Rekomendasi implementasi tetap berlaku:** simpan aturan "blokir total" vs "izinkan dengan status" sebagai kolom data (`mode_sebelum_jendela`, `mode_setelah_jendela`, `status_yang_diberikan`) di `jam_kerja_sesi`, bukan `if/else` hardcode — karena aturan ini sudah terbukti berubah dua kali dalam proses diskusi ini saja.

### 5.4 Perhitungan Keterlambatan → Potongan Tunjangan

Mengacu tabel `pengaturan_potongan` (Bagian 4.2), dihitung otomatis oleh job/trigger setelah `presensi` tersimpan:

```
fungsi hitung_potongan(pegawai_id, bulan):
  ambil semua baris presensi bulan tsb untuk pegawai_id
  total_potongan_persen = 0
  untuk setiap baris:
    jika status == 'terlambat':
      cari baris pengaturan_potongan WHERE jenis='terlambat'
        AND menit_dari <= menit_keterlambatan
        AND (menit_sampai IS NULL OR menit_keterlambatan <= menit_sampai)
      total_potongan_persen += persen_potongan baris tsb
    jika status == 'pulang_cepat':
      # logika serupa dengan jenis='pulang_cepat'
    jika status == 'tidak_hadir':
      total_potongan_persen += persen_potongan jenis='tidak_hadir' (biasanya 1 hari penuh)
  simpan agregat bulanan ke tabel rekap_kinerja_bulanan (lihat 4.2 tambahan opsional)
  return total_potongan_persen  -- dipakai bagian keuangan/BKPSDM sebagai dasar SK potongan TPP
```

Sistem **tidak menghitung nominal rupiah** (karena besaran tunjangan kinerja per jabatan/golongan biasanya diatur Perbup terpisah dan bisa berubah) — sistem hanya menghasilkan **persentase potongan & rekap menit keterlambatan per pegawai per bulan**, yang kemudian dikalikan nominal TPP oleh modul/tim keuangan. Ini memisahkan tanggung jawab (separation of concerns) dan membuat sistem tetap valid walau besaran TPP berubah.

## 6. Modul Anti-Kecurangan — Face Recognition, Liveness, Anti Fake-GPS, Device Binding

### 6.1 [REVISI v2] Kenapa QR Rotasi Saja Tidak Cukup — Kasus "Titip Absen"

QR yang berubah tiap menit **menutup celah**: screenshot QR dikirim ke teman lewat WhatsApp (karena expired dalam 2 menit dan pasti sudah dipakai/hangus saat teman coba pakai), atau orang login dari jauh lalu minta teman scan dari layar HP-nya lewat foto (sama, keburu expired). **Tapi tidak menutup** skenario titip akun: pegawai memberi tahu username/password ke teman, temannya login di HP-nya sendiri (device binding pegawai sudah tidak diterapkan lagi di v2, sesuai keputusan Anda), lalu scan QR kiosk — **secara teknis semua langkah valid** kecuali satu: **wajah yang terverifikasi bukan wajah pemilik akun**.

**Ini sebabnya di v2, face recognition menjadi satu-satunya lapisan identitas** (menggantikan peran device binding pegawai yang dihapus). Urutan lapisan pertahanan v2:

1. Login akun (password/OTP) — bisa dari HP mana pun.
2. **Face verification server-side** (Bagian 6.2 revisi) — wajib lolos **sebelum** menu scan QR terbuka.
3. **Liveness check** sebagai bagian dari langkah 2 — pastikan wajah asli real-time.
4. **Bukti lokasi fisik**: hanya bisa lanjut kalau berhasil memindai QR kiosk kantor (Bagian 6.5 revisi) — ini otomatis menggantikan peran geofence GPS.

Karena device binding pegawai dihapus, **kekuatan seluruh sistem identitas sekarang bertumpu penuh pada langkah 2** — ini konsekuensi langsung dari keputusan Anda dan sudah tepat selama implementasinya **server-side**, bukan sekadar client-trust (lihat catatan penting di 6.2 revisi). Titip-absen masih **secara teori** mungkin lewat kolusi penuh (pemilik akun hadir sendiri men-scan wajah temannya yang sudah login di akun pemilik) — tapi ini kembali ke prinsip Bagian 1: sistem menaikkan biaya kecurangan & meninggalkan jejak audit, bukan menjamin mustahil 100%.

### 6.2 [REVISI v2] Face Recognition — Verifikasi Wajib Server-Side, Bukan Client-Trust

**Perubahan kritis dari v1:** karena tidak ada lagi device binding yang "menjaga" identitas dari sisi perangkat, HP pegawai kini menjadi **satu-satunya titik input identitas** — sehingga HP pegawai **tidak boleh** menjadi pihak yang memutuskan "saya lolos verifikasi". Alur v2 wajib:

1. HP pegawai men-capture wajah → hitung **face descriptor** (128-d vector) di HP via `face-api.js` (boleh tetap di client, ini hanya komputasi, bukan keputusan).
2. HP kirim descriptor tsb (bukan boolean "lulus/gagal") ke endpoint server `POST /api/face/verify`.
3. **Server** mengambil `face_embedding` tersimpan milik akun yang sedang login, hitung cosine similarity/euclidean distance **di server**, dan **server yang memutuskan** lolos/tidak berdasar threshold.
4. Jika lolos, server terbitkan `face_session_token` (signed, berumur pendek ±90 detik) — inilah yang membuka menu scan QR (Bagian 5.2). Token ini **tidak bisa dipalsukan dari client** karena ditandatangani server dengan secret yang tidak pernah dikirim ke HP.
5. **Kenapa ini wajib:** kalau keputusan "lolos" dibuat & dipercaya begitu saja dari HP (client-side only), pengguna yang paham teknis (root, modifikasi JS via DevTools/Frida) bisa membuat HP-nya selalu mengirim "lulus=true" tanpa pernah benar-benar cocok wajahnya — meniadakan seluruh manfaat face recognition. Menghitung similarity di server menutup celah ini karena keputusan akhir tidak pernah ada di tangan client.

**Soal akurasi matching** (tetap berlaku dari v1): untuk kasus **1:1 verification** (bandingkan dengan **satu** wajah terdaftar milik akun yang login), model open-source seperti FaceNet/ArcFace yang mendasari `face-api.js` sudah **sangat baik (>99% pada benchmark standar)** untuk kondisi pencahayaan wajar. Yang membedakan solusi gratis dari solusi mahal bukan soal "bisa/tidak bisa mencocokkan", tapi soal **liveness/anti-spoofing** (Bagian 6.3) dan **jaminan formal/sertifikasi** (audit independen seperti iBeta/NIST FRVT).

**Implementasi teknis (gratis):**
- **Enrollment**: dilakukan admin/HR bersama pegawai secara langsung (memastikan foto asli, bukan upload sembarangan) → simpan embedding ke `pegawai_face_enrollment.face_embedding`, foto asli di Supabase Storage bucket privat.
- **Verifikasi**: descriptor dihitung di HP (ringan, cepat), similarity dihitung & diputuskan di server (Edge Function/API route) — pembagian kerja ini menjaga biaya komputasi tetap rendah (zero-budget friendly) sekaligus menjaga keputusan tetap terpercaya.

### 6.3 Liveness Detection — Batasan Jujur

Deteksi "ini wajah asli, bukan foto/video/deepfake" **jauh lebih sulit** dari sekadar mencocokkan wajah, dan **inilah bagian yang paling mungkin ditembus** pada solusi gratis. Pendekatan yang direkomendasikan (defense-in-depth, bukan satu solusi sempurna):

1. **Active liveness challenge**: sistem minta aksi acak ("berkedip 2x", "geleng ke kiri", "senyum") dan memverifikasi gerakan landmark wajah (via MediaPipe Face Mesh, 468 titik) benar-benar berubah sesuai instruksi dalam rentang waktu wajar (mis. 3 detik). Foto statis tidak bisa "berkedip" sesuai perintah acak.
2. **Deteksi bingkai/layar** (heuristik tambahan): analisis gambar untuk mendeteksi tepi persegi (bingkai foto cetak/layar HP lain), pantulan cahaya tidak wajar, atau rasio aspek mencurigakan — bukan sempurna tapi menaikkan kesulitan.
3. **Depth-cue sederhana**: minta pegawai mendekat/menjauh dari kamera sedikit dan cek perubahan skala wajah proporsional (foto datar akan menskalakan berbeda dari wajah 3D asli saat sudut kamera berubah sedikit).
4. **[Catatan trade-off v2] Kamera kini di HP pegawai sendiri, bukan lagi di perangkat kiosk:** karena arah alur dibalik (Bagian 5.2 revisi — face-check terjadi di HP pegawai sebelum scan QR kiosk), verifikasi wajah v2 **kembali bersifat selfie-style**, sehingga sebagian risiko yang tadinya dihindari di desain v1 (video call ke HP lain, virtual camera) **relevan lagi**. Ini konsekuensi wajar dari keputusan menghapus device binding pegawai — dan cara menambalnya bukan mengembalikan device binding, melainkan menguatkan liveness challenge (poin 1–3 di atas) dan tetap mengandalkan langkah 4 di Bagian 6.5 revisi: **bukti lokasi fisik lewat scan QR kiosk** sebagai lapisan independen yang tidak bergantung pada kejujuran kamera HP.
5. **Jika butuh level lebih tinggi tanpa budget**: SDK open-source seperti `FaceRecognition-LivenessDetection-Javascript` (ONNX Runtime Web, berjalan di browser, gratis, ada deteksi liveness terhadap foto/video/masker 3D) bisa dievaluasi sebagai pengganti kombinasi 1–3, dengan catatan tetap **uji internal** akurasinya sebelum diandalkan penuh.

**Kesimpulan jujur:** face **matching** — ya, terbukti bisa dan andal (Bagian 6.2 revisi). Face **liveness/anti-spoofing tingkat sertifikasi vendor mahal** — solusi gratis bisa mendekati tapi realistis belum menyamai produk bersertifikat iBeta/NIST, dan di v2 risiko ini sedikit naik karena kamera kembali ada di HP pegawai (poin 4 di atas). Risiko sisa terbesar tetap **kolusi penuh** (pemilik akun hadir menyerahkan HP-nya yang sudah lolos login untuk dipakai wajah orang lain) — untuk itu tidak ada solusi teknis murni; ini murni soal kebijakan & sanksi disiplin, dibantu audit trail (Bagian 11.3).

### 6.4 [REVISI v2] Device Binding — Kini untuk KIOSK, Bukan HP Pegawai

Sesuai keputusan revisi, device binding **dihapus dari sisi HP pegawai** (pegawai boleh pakai HP siapa pun asal login akun sendiri + lolos face verification server-side) dan **dipindahkan sepenuhnya ke perangkat kiosk** (Bagian 5.2c), yang jauh lebih tepat karena kiosk adalah aset kantor yang secara fisik dikontrol admin:

```
Alur pendaftaran kiosk:
  1. Admin registrasi kiosk baru di dashboard -> isi nama, unit kerja, lokasi (lat/long)
  2. Sistem generate device_secret acak panjang, ditampilkan SEKALI untuk
     disalin ke kiosk (disimpan di localStorage/IndexedDB kiosk) -> server
     hanya simpan hash-nya (perangkat_kiosk.device_secret_hash)
  3. Setiap request generate-token dari kiosk wajib sertakan device_secret;
     server tolak kalau tidak cocok / kiosk dinonaktifkan admin
  4. Kiosk hilang/dicuri -> admin nonaktifkan lewat dashboard, device_secret
     lama otomatis tidak berlaku
```

Ini menghapus seluruh masalah operasional device binding pegawai (HP ketinggalan/rusak/kuota habis) sambil tetap menutup celah "siapa pun bisa memasang kiosk palsu" — karena hanya kiosk terdaftarlah yang bisa minta token dari server.

### 6.5 [REVISI v2] Bukti Lokasi & Fake GPS — Sekarang Lewat Kedekatan Fisik ke Kiosk, Bukan GPS HP Pegawai

Anda benar bahwa **fake GPS pada dasarnya selalu bisa ditembus** oleh pengguna yang cukup mau berusaha (root + Magisk module penyembunyi status mock). Riset (Bagian 2.3) mengonfirmasi ini sebagai fakta industri. **Kabar baiknya, desain v2 membuat masalah ini nyaris tidak relevan** untuk alur presensi utama:

- Karena QR kini **ditampilkan di kiosk (lokasi tetap kantor)** dan **HP pegawai yang harus memindainya**, keberhasilan scan **hanya mungkin terjadi kalau HP secara fisik berada dalam jarak baca kamera** (biasanya <1–2 meter) dari kiosk tsb. Ini adalah bukti kehadiran fisik yang jauh lebih kuat daripada koordinat GPS mana pun — **HP pegawai bahkan tidak perlu mengirim data GPS sama sekali** untuk membuktikan lokasi.
- Konsekuensinya: **jawaban langsung atas pertanyaan penutup Anda ("berarti aplikasi harus dibangun native supaya bisa aktifkan GPS & deteksi fake GPS")** adalah **tidak perlu**. Kebutuhan native app untuk cek `isMock`/`isFromMockProvider` hanya relevan jika bukti lokasi bergantung pada GPS self-report HP pegawai — dan di desain v2, itu **bukan lagi mekanisme pembuktian lokasi**. PWA berbasis browser di HP pegawai sudah cukup.
- Lokasi kiosk sendiri **tidak perlu dideteksi fake-GPS** karena tidak diisi via GPS real-time — melainkan diinput manual sekali oleh admin saat registrasi (Bagian 6.4 revisi) dan dianggap tetap selama kiosk tidak dipindah tanpa sepengetahuan admin.
- **Kapan native app baru relevan:** hanya jika ke depan Anda menambahkan **mode presensi mandiri jarak jauh** (dinas luar/WFA) yang tidak melibatkan scan kiosk sama sekali dan harus mengandalkan GPS self-report HP pegawai — untuk mode itu (opsional, di luar alur utama), barulah tabel mitigasi fake-GPS berlapis (root detection, kecepatan mustahil, dsb.) dan pertimbangan native/TWA jadi relevan kembali.

## 7. Modul & Fitur Aplikasi per Peran Pengguna

### 7.1 Peran (Roles) — via Supabase Auth + RLS

- **Pegawai**: lihat jadwal sendiri, lakukan absensi (tampilkan QR), lihat riwayat & rekap keterlambatan pribadi, ajukan sanggahan/izin.
- **Petugas Scanner** (bisa akun khusus tanpa hak lain, dipasang di perangkat tablet/laptop titik presensi): halaman scan QR + kamera face-match, feed status real-time ("✅ Budi — tepat waktu", "⚠️ Siti — terlambat 12 menit").
- **Admin Unit Kerja**: kelola pegawai di unitnya, atur pola hari kerja & jam sesi untuk unit, lihat rekap unit, kelola registrasi/reset `device_secret` kiosk unitnya, approve sanggahan.
- **Super Admin (BKPSDM/Diskominfo)**: kelola seluruh instansi/unit, atur `pengaturan_potongan`, audit log lintas unit, ekspor laporan ke Sheets, kelola integrasi Google API.

### 7.2 Daftar Fitur (checklist untuk agentic AI)

**Modul Pegawai** *(v2)*
- [ ] Login (Supabase Auth — email/NIP + password, atau magic link) — **boleh dari HP mana pun**, tidak ada pembatasan device
- [ ] Halaman "Absensi Hari Ini" — status 3 sesi (masuk/istirahat/pulang), tombol "Mulai Absensi" muncul hanya saat sesi terbuka & belum absen
- [ ] Layar verifikasi wajah (capture → kirim descriptor ke server → tunggu `face_session_token`) — **wajib lolos dulu** sebelum menu scan terbuka (Bagian 5.2, 6.2 revisi)
- [ ] Menu pemindai QR (kamera HP mengarah ke kiosk) — hanya aktif kalau `face_session_token` masih berlaku (±90 detik)
- [ ] Riwayat presensi pribadi (kalender bulanan, kode warna: hijau tepat waktu, kuning telat, biru "tidak ada di kantor", merah alpa)
- [ ] Rekap potongan tunjangan bulan berjalan (transparansi ke pegawai)
- [ ] Form pengajuan sanggahan/izin (upload surat keterangan ke Drive API atau Storage)
- [ ] Enrollment wajah (halaman khusus, dipandu admin/HR, dilakukan sekali/saat perlu update)

**Modul Kiosk (v2 — menggantikan "Petugas Scanner")**
- [ ] Halaman full-screen menampilkan QR besar (bukan kamera) — dipasang di tablet/Android box tetap di titik presensi
- [ ] Auto-rotate QR: instan saat token diklaim pegawai (via Realtime), fallback tiap 1 menit jika tidak ada yang scan
- [ ] Feed log real-time siapa saja yang baru absen (untuk transparansi & mencegah orang menyangkal, ditampilkan di layar kiosk atau layar admin terpisah)
- [ ] Autentikasi kiosk via `device_secret` (Bagian 6.4 revisi), bukan login akun pegawai
- [ ] Mode offline-tolerant: jika koneksi terputus sesaat, tampilkan status "menyambung ulang" dan hentikan klaim baru sampai online kembali (mencegah token dobel-klaim)

**Modul Admin Unit**
- [ ] CRUD data pegawai + penugasan pola hari kerja
- [ ] Editor jam kerja sesi (Bagian 5.1)
- [ ] Registrasi & manajemen kiosk unit (generate/reset `device_secret`, set lokasi)
- [ ] Dashboard rekap harian unit (grafik kehadiran, telat, alpa, tidak-ada-di-kantor)
- [ ] Laporan pola "tidak ada di kantor" berulang per pegawai (Bagian 5.3 revisi) untuk pemantauan kedisiplinan
- [ ] Approve/reject sanggahan

**Modul Super Admin**
- [ ] Kelola multi-instansi/unit & seluruh kiosk terdaftar lintas instansi
- [ ] Editor `pengaturan_potongan` (aturan berjenjang)
- [ ] Audit log & pencarian anomali (filter: skor wajah rendah, kiosk tidak biasa, percobaan gagal beruntun)
- [ ] Ekspor rekap ke Google Sheets (manual trigger + terjadwal)
- [ ] Backup manual ke Google Drive
- [ ] Pengaturan integrasi Google API (OAuth/service account)
- [ ] Manajemen notifikasi (Web Push: pengingat 10 menit sebelum sesi tutup)

### 7.3 Notifikasi & Reminder

Gunakan **Web Push API** (gratis, VAPID key self-hosted) untuk:
- Pengingat H-10 menit sebelum jendela sesi masuk/istirahat/pulang tertutup
- Notifikasi ke admin saat anomali terdeteksi (skor wajah rendah tapi tetap lolos, lokasi mencurigakan)
- Ringkasan mingguan ke pegawai (opsional)

## 8. Tampilan "Mirip Aplikasi Native Android" (PWA) — Panduan Implementasi

### 8.1 Checklist PWA Wajib

- [ ] `manifest.json` lengkap (`display: "standalone"`, `theme_color`, `background_color`, icon 192px & 512px + maskable icon)
- [ ] Service Worker (via `next-pwa` atau Workbox) untuk cache asset & app-shell, mendukung "Add to Home Screen"
- [ ] Splash screen otomatis dari manifest (Android generate dari icon+background_color, tidak perlu asset terpisah)
- [ ] Status bar & safe-area handling (`viewport-fit=cover`, CSS `env(safe-area-inset-*)`)
- [ ] Navigasi ala native: **Bottom Navigation Bar** (bukan sidebar/topbar seperti web desktop) untuk 4-5 menu utama pegawai (Beranda, Absensi, Riwayat, Profil)
- [ ] Transisi halaman ala native (slide, bukan reload penuh — manfaatkan Next.js client-side routing + Framer Motion untuk transisi halus)
- [ ] Komponen ala Material Design 3 / Android: ripple effect on tap, bottom sheet untuk modal (bukan popup tengah layar ala web), FAB (Floating Action Button) untuk aksi utama "Absen Sekarang"
- [ ] Font & sizing ala Android (Roboto/Inter, touch target minimal 48×48px, jarak antar elemen konsisten dengan grid 8px)
- [ ] Haptic feedback via `navigator.vibrate()` saat aksi penting (QR berhasil discan)
- [ ] Pull-to-refresh pada halaman riwayat
- [ ] Icon set konsisten (gunakan `lucide-react`, gaya line-icon mirip Material Symbols)

### 8.2 Contoh `manifest.json`

```json
{
  "name": "Presensi ASN Kotabaru",
  "short_name": "Presensi",
  "description": "Aplikasi presensi pegawai berbasis QR dinamis",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0F172A",
  "theme_color": "#0F172A",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 8.3 Referensi Desain "Native-Feel"

Gunakan token desain berikut sebagai baseline Tailwind config agar konsisten dengan bahasa visual Android modern (Material You):

- Radius sudut besar (16–28px) untuk card & bottom sheet
- Warna dinamis 1 aksen utama + neutral grayscale (hindari flat web-style border tipis di semua elemen — Android lebih banyak pakai elevation/shadow lembut)
- Bottom nav dengan indicator pill animasi saat tab aktif (bukan underline gaya web)
- Skeleton loading (bukan spinner polos) untuk kesan app modern

**Opsi lanjutan (Bagian 3.3):** setelah PWA solid, bungkus dengan **Bubblewrap** (`npx @bubblewrap/cli init`) untuk hasilkan APK TWA yang bisa disebar via link/Play Store internal — kode Next.js/React yang sama dipakai ulang 100%, hanya menambah `assetlinks.json` untuk verifikasi domain.

## 9. Panduan Setup Step-by-Step (dari Nol sampai Deploy)

> Jalankan urut. Perintah untuk Windows (PowerShell) & macOS/Linux (bash) dicatat terpisah bila berbeda.

### 9.1 Prasyarat — Install di Komputer

1. **Node.js LTS** (v20+): unduh dari https://nodejs.org atau via package manager:
   ```bash
   # macOS (Homebrew)
   brew install node

   # Windows: unduh installer .msi dari nodejs.org, lalu verifikasi:
   node -v
   npm -v
   ```
2. **Git**: https://git-scm.com/downloads → verifikasi `git --version`
3. **GitHub CLI** (opsional tapi mempermudah): https://cli.github.com
4. **Editor**: VS Code (https://code.visualstudio.com) + extension "ESLint", "Prettier", "Tailwind CSS IntelliSense"
5. **Akun** yang perlu dibuat (semua gratis):
   - GitHub → https://github.com/signup
   - Vercel → https://vercel.com/signup (login pakai akun GitHub agar auto-terhubung)
   - Supabase → https://supabase.com/dashboard (login pakai GitHub)
   - Google Cloud Console → https://console.cloud.google.com (pakai akun Google/Gmail biasa, gratis, hanya perlu kartu kredit jika suatu saat mengaktifkan API berbayar — untuk Sheets/Drive API dasar tidak perlu billing aktif)

### 9.2 Inisialisasi Repo GitHub & Proyek Next.js

```bash
# 1. Buat folder & init Next.js (pilih: TypeScript=Yes, ESLint=Yes,
#    Tailwind=Yes, src/ dir=Yes, App Router=Yes, import alias=Yes/@/*)
npx create-next-app@latest presensi-asn-kotabaru
cd presensi-asn-kotabaru

# 2. Init git (jika belum otomatis) & commit awal
git init
git add .
git commit -m "chore: init next.js project"

# 3. Buat repo di GitHub lalu hubungkan (ganti <username>)
gh repo create presensi-asn-kotabaru --public --source=. --remote=origin
git branch -M main
git push -u origin main
```

Jika tidak pakai `gh` CLI: buat repo manual di https://github.com/new, lalu:
```bash
git remote add origin https://github.com/<username>/presensi-asn-kotabaru.git
git branch -M main
git push -u origin main
```

### 9.3 Install Dependensi Utama

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install qrcode html5-qrcode
npm install @vladmandic/face-api
npm install zod react-hook-form @hookform/resolvers
npm install date-fns date-fns-tz
npm install lucide-react framer-motion
npm install next-pwa
npm install googleapis         # untuk integrasi Sheets & Drive API
npm install -D @types/qrcode

# shadcn/ui (komponen UI siap pakai, gratis, styling via Tailwind)
npx shadcn@latest init
npx shadcn@latest add button card dialog sheet tabs badge avatar skeleton
```

### 9.4 Setup Supabase

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Buat project baru via dashboard (lebih mudah dari CLI untuk pemula):
#    https://supabase.com/dashboard/new -> pilih Organization -> beri nama
#    "presensi-asn-kotabaru" -> pilih region terdekat (Singapore) -> Free plan
#    -> catat: Project URL, anon public key, service_role key (JANGAN commit ke git!)

# 4. Hubungkan CLI lokal ke project (ganti <project-ref> sesuai dashboard)
supabase init
supabase link --project-ref <project-ref>

# 5. Aktifkan extension yang dibutuhkan lewat SQL Editor di dashboard Supabase:
#    (Project -> SQL Editor -> New query -> paste, lalu Run)
```
```sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists vector;   -- untuk face embedding similarity search
```

```bash
# 6. Simpan skema SQL (Bagian 4.2 dokumen ini) ke file migration:
mkdir -p supabase/migrations
# buat file: supabase/migrations/0001_init_schema.sql
#   -> isi dengan seluruh DDL SQL dari Bagian 4.2

# 7. Jalankan migration ke project
supabase db push
```

### 9.5 Environment Variables

Buat file `.env.local` (JANGAN pernah commit file ini — pastikan ada di `.gitignore`):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxx   # hanya dipakai di server (API routes/Edge Functions)

QR_SIGNING_SECRET=<generate acak 32+ karakter>   # lihat cara generate di bawah

GOOGLE_SERVICE_ACCOUNT_EMAIL=xxxx@xxxx.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_REKAP_ID=<spreadsheet ID dari URL sheet>
GOOGLE_DRIVE_BACKUP_FOLDER_ID=<folder ID Drive untuk backup>

VAPID_PUBLIC_KEY=xxxx
VAPID_PRIVATE_KEY=xxxx
```

Generate `QR_SIGNING_SECRET` secara acak:
```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Generate VAPID keys (untuk Web Push):
```bash
npx web-push generate-vapid-keys
```

### 9.6 Setup Google Cloud Console (Sheets API + Drive API)

1. Buka https://console.cloud.google.com → buat **New Project** → beri nama `presensi-asn-kotabaru`.
2. Buka menu **APIs & Services → Library**, cari lalu **Enable**:
   - `Google Sheets API`
   - `Google Drive API`
3. Buat **Service Account** (agar server bisa akses tanpa login interaktif tiap pegawai):
   - Menu **IAM & Admin → Service Accounts → Create Service Account**
   - Nama: `presensi-sheets-writer` → Create and Continue → Role: `Editor` (atau lebih spesifik) → Done
   - Klik service account yang baru dibuat → tab **Keys → Add Key → Create new key → JSON** → file JSON otomatis terunduh (**simpan aman, jangan commit ke git**)
   - Dari file JSON, ambil `client_email` → isi ke `GOOGLE_SERVICE_ACCOUNT_EMAIL`; ambil `private_key` → isi ke `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
4. **Share** Google Sheet target (buat spreadsheet kosong dulu di Google Sheets) ke email service account tsb dengan akses **Editor** (klik tombol Share di Sheets, paste `client_email`).
5. **Share** folder Google Drive target (untuk backup) ke email service account yang sama.
6. Ambil `GOOGLE_SHEETS_REKAP_ID` dari URL spreadsheet: `https://docs.google.com/spreadsheets/d/<INI_ID_NYA>/edit`.
7. Ambil `GOOGLE_DRIVE_BACKUP_FOLDER_ID` dari URL folder Drive: `https://drive.google.com/drive/folders/<INI_ID_NYA>`.

### 9.7 Setup PWA

```bash
npm install next-pwa
```

Update `next.config.js`:
```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
});
```

Buat folder `public/icons/` berisi `icon-192.png`, `icon-512.png`, `icon-maskable.png` (bisa digenerate dari 1 logo via https://realfavicongenerator.net atau `npx pwa-asset-generator`), lalu tambahkan `public/manifest.json` seperti contoh Bagian 8.2, dan hubungkan di `app/layout.tsx`:
```tsx
export const metadata = {
  manifest: '/manifest.json',
  themeColor: '#0F172A',
};
```

### 9.8 Setup Face Recognition Models

`face-api.js` butuh file model (gratis, dari repo resminya) diletakkan di folder `public`:
```bash
mkdir -p public/models
# Unduh model dari repo resmi (contoh beberapa file inti yang dibutuhkan):
curl -L -o public/models/tiny_face_detector_model-weights_manifest.json \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -L -o public/models/tiny_face_detector_model-shard1 \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
curl -L -o public/models/face_landmark_68_model-weights_manifest.json \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -L -o public/models/face_landmark_68_model-shard1 \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
curl -L -o public/models/face_recognition_model-weights_manifest.json \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -L -o public/models/face_recognition_model-shard1 \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -L -o public/models/face_recognition_model-shard2 \
  https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
```
> Agen AI yang mengerjakan: cek ulang daftar file lengkap di repo `justadudewhohacks/face-api.js/tree/master/weights` karena jumlah shard bisa berbeda per model version — unduh seluruh isi folder `weights` untuk aman.

### 9.9 Jalankan Lokal & Uji Coba

```bash
npm run dev
# buka http://localhost:3000
```

Untuk uji kamera/QR di HP fisik dari jaringan lokal (karena kamera butuh HTTPS atau localhost):
```bash
# gunakan tunnel gratis, contoh ngrok
npx ngrok http 3000
# akses URL https yang diberikan ngrok dari HP
```

### 9.10 Deploy ke Vercel

```bash
npm install -g vercel
vercel login
vercel link          # hubungkan folder ke project Vercel (buat baru saat ditanya)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add QR_SIGNING_SECRET production
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production
vercel env add GOOGLE_SHEETS_REKAP_ID production
vercel env add GOOGLE_DRIVE_BACKUP_FOLDER_ID production
vercel env add VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production

vercel --prod
```

Atau lebih simpel: **hubungkan repo GitHub langsung di dashboard Vercel** (https://vercel.com/new → Import Git Repository) → isi Environment Variables lewat UI → setiap `git push` ke `main` otomatis deploy (CI/CD gratis bawaan).

### 9.11 Setup Cron Job (rotasi QR & tugas terjadwal)

Karena Vercel Hobby membatasi cron ke frekuensi tertentu (biasanya cukup untuk kebutuhan menit-an via **Vercel Cron** minimal interval 1 menit pada Hobby), buat `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/generate-qr-tokens", "schedule": "* * * * *" },
    { "path": "/api/cron/tutup-sesi-harian", "schedule": "5,45 * * * *" },
    { "path": "/api/cron/ekspor-sheets", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/backup-drive", "schedule": "0 2 * * *" }
  ]
}
```
Lindungi endpoint cron dengan header rahasia (`CRON_SECRET` env var, dicek di setiap handler) agar tidak bisa dipanggil publik sembarangan.

> **Alternatif jika kuota cron Vercel Hobby terasa terbatas:** pakai **Supabase Edge Functions + `pg_cron`** (gratis, dijalankan di sisi database Supabase) sebagai penjadwal utama untuk rotasi token tiap menit, dan sisakan Vercel Cron untuk tugas yang lebih jarang (ekspor Sheets, backup Drive).

## 10. Struktur Proyek & Konvensi Kode

```
presensi-asn-kotabaru/
├── src/
│   ├── app/
│   │   ├── (pegawai)/
│   │   │   ├── beranda/page.tsx
│   │   │   ├── absensi/page.tsx          # verifikasi wajah -> buka menu scan (5.2 v2)
│   │   │   ├── absensi/scan/page.tsx     # kamera HP memindai QR kiosk
│   │   │   ├── riwayat/page.tsx
│   │   │   └── profil/page.tsx
│   │   ├── (kiosk)/                       # [REVISI v2] dulu (scanner), sekarang device kantor MENAMPILKAN QR
│   │   │   └── tampilan/page.tsx          # full-screen QR + feed log real-time
│   │   ├── (admin)/
│   │   │   ├── pegawai/page.tsx
│   │   │   ├── jam-kerja/page.tsx        # modul setting jam kerja (5.1)
│   │   │   ├── pola-hari-kerja/page.tsx
│   │   │   ├── kiosk/page.tsx             # [BARU v2] registrasi & reset device_secret kiosk
│   │   │   ├── potongan/page.tsx
│   │   │   └── audit-log/page.tsx
│   │   ├── api/
│   │   │   ├── presensi/verify/route.ts  # klaim atomik token + pipeline verifikasi (5.2)
│   │   │   ├── face/verify/route.ts      # [BARU v2] hitung similarity SERVER-SIDE (6.2)
│   │   │   ├── qr/generate/route.ts      # dipanggil oleh KIOSK (bukan HP pegawai)
│   │   │   └── cron/
│   │   │       ├── generate-qr-tokens/route.ts   # fallback rotasi 1 menit per kiosk
│   │   │       ├── tutup-sesi-harian/route.ts
│   │   │       ├── ekspor-sheets/route.ts
│   │   │       └── backup-drive/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                            # shadcn components
│   │   ├── qr-display.tsx                 # dipakai di halaman kiosk
│   │   ├── qr-scanner.tsx                 # dipakai di HP pegawai
│   │   ├── face-capture.tsx               # dipakai di HP pegawai, kirim descriptor ke server
│   │   └── bottom-nav.tsx
│   ├── lib/
│   │   ├── supabase/ (client.ts, server.ts, middleware.ts)
│   │   ├── qr-token.ts                    # generate & klaim atomik HMAC (5.2)
│   │   ├── jam-kerja.ts                   # evaluasi state machine (5.3)
│   │   ├── potongan.ts                    # hitung potongan (5.4)
│   │   ├── face-recognition.ts            # similarity server-side (6.2)
│   │   ├── kiosk-auth.ts                  # [BARU v2] validasi device_secret kiosk (6.4)
│   │   ├── google-sheets.ts
│   │   └── google-drive.ts
│   └── types/
│       └── database.types.ts              # digenerate via `supabase gen types typescript`
├── supabase/
│   └── migrations/
├── public/
│   ├── models/                            # face-api.js models
│   ├── icons/
│   └── manifest.json
├── .env.local                             # JANGAN commit
├── .env.example                           # commit versi tanpa nilai asli
├── next.config.js
├── vercel.json
└── package.json
```

Generate tipe TypeScript otomatis dari skema Supabase (jaga konsistensi tipe data):
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

## 11. Keamanan: Row Level Security, Rate Limiting, Audit Trail

### 11.1 Contoh RLS Policy (Supabase)

```sql
alter table pegawai enable row level security;
alter table presensi enable row level security;
alter table qr_token enable row level security;

-- Pegawai hanya bisa lihat data dirinya sendiri
create policy "pegawai lihat data sendiri"
  on pegawai for select
  using (auth_user_id = auth.uid());

-- Pegawai hanya bisa lihat presensi miliknya sendiri
create policy "pegawai lihat presensi sendiri"
  on presensi for select
  using (
    pegawai_id in (select id from pegawai where auth_user_id = auth.uid())
  );

-- Admin unit bisa lihat semua pegawai di unitnya (asumsi ada tabel admin_unit_kerja)
create policy "admin lihat pegawai unitnya"
  on pegawai for select
  using (
    unit_kerja_id in (
      select unit_kerja_id from admin_unit_kerja where auth_user_id = auth.uid()
    )
  );

-- qr_token TIDAK BOLEH dibaca langsung oleh client biasa (hanya via API route
-- dengan service_role key di server) — jangan buat policy select untuk role 'anon'/'authenticated'
-- pada tabel ini; biarkan default deny, akses hanya lewat server-side.
```

### 11.2 Rate Limiting Endpoint Kritis

Endpoint `/api/presensi/verify` dan `/api/qr/generate` wajib dibatasi (mis. via Upstash Redis free tier atau in-memory sederhana + Vercel Edge Middleware) untuk mencegah brute-force menebak token:
- Maks 10 percobaan verifikasi per `device_id`/IP per menit
- Maks 5 kali generate-QR gagal berturut-turut → butuh cooldown 5 menit

### 11.3 Audit Trail Wajib

Setiap event di `presensi_verifikasi_log` (Bagian 4.2) dicatat untuk **seluruh** percobaan (sukses maupun gagal) — ini krusial untuk proses pembuktian jika ada kecurigaan kecurangan atau sanggahan pegawai. Retensi minimal 1 tahun (arsipkan ke Google Drive sebagai CSV/JSON setelah itu untuk hemat kuota 500 MB Supabase).

## 12. Roadmap Pengembangan Bertahap

**Fase 0 — Fondasi (Minggu 1-2)**
Setup repo, Supabase, skema DB dasar, autentikasi, struktur PWA, modul setting jam kerja & pola hari kerja (Bagian 5.1) — **tanpa** face recognition dulu.

**Fase 1 — MVP Presensi QR (Minggu 3-5)**
Rotasi QR (5.2), state machine jam kerja (5.3), halaman scanner, perhitungan telat & potongan (5.4), dashboard admin dasar. **Uji paralel dengan sistem manual/MASOOK** selama minimal 2 minggu sebelum dipakai resmi, untuk membandingkan akurasi.

**Fase 2 — Anti-Kecurangan Biometrik (Minggu 6-9)**
Face enrollment & matching (server-side, Bagian 6.2 revisi), liveness challenge dasar, registrasi device binding kiosk (Bagian 6.4 revisi), audit log lengkap, notifikasi anomali ke admin.

**Fase 3 — Integrasi Google & Pelaporan (Minggu 10-11)**
Ekspor otomatis ke Sheets, backup ke Drive, laporan bulanan siap cetak (PDF), form sanggahan.

**Fase 4 — Hardening & Skalabilitas (Minggu 12+)**
Rate limiting, load testing (simulasikan ratusan pegawai absen bersamaan jam 07:15), evaluasi apakah perlu wrap TWA/Capacitor untuk deteksi mock-GPS tingkat OS (Bagian 3.3, hanya relevan jika mode presensi jarak jauh ditambahkan), audit keamanan menyeluruh, sosialisasi & pelatihan pengguna.

**Rekomendasi rilis:** jangan langsung menggantikan MASOOK — jalankan sebagai **sistem pendamping/pilot di 1-2 unit kerja kecil** (mis. unit Anda sendiri dulu) selama minimal 1 bulan penuh, kumpulkan masukan, baru diusulkan sebagai alternatif/pengganti resmi ke BKPSDM.

## 13. Kepatuhan Data Pribadi (UU PDP) untuk Data Biometrik

Data wajah (`face_embedding`) dan lokasi presensi termasuk **data pribadi bersifat spesifik** (data biometrik) menurut UU No. 27/2022 tentang Pelindungan Data Pribadi (PDP). Sebelum go-live, pastikan:

- **Persetujuan eksplisit (consent)** tertulis dari tiap pegawai saat enrollment wajah — jelaskan tujuan penggunaan (verifikasi presensi), bukan tujuan lain.
- **Pembatasan akses**: hanya server (service_role) yang bisa membaca `face_embedding` mentah; jangan pernah expose ke client selain untuk kebutuhan matching di device yang sedang login.
- **Retensi & penghapusan**: sediakan mekanisme hapus data biometrik jika pegawai pindah/berhenti (right to erasure).
- **Enkripsi at-rest**: Supabase Postgres sudah terenkripsi at-rest secara default; pastikan foto di Storage bucket **privat** (bukan public bucket).
- **Dasar hukum internal**: karena ini instansi pemerintah, konsultasikan dengan bagian hukum/Diskominfo Kotabaru terkait kebutuhan **Data Protection Impact Assessment (DPIA)** sederhana sebelum implementasi skala penuh, khususnya karena data ini juga dipakai sebagai dasar keputusan administratif (potongan tunjangan) — pastikan ada **mekanisme sanggahan manusia** (bukan keputusan algoritma murni tanpa jalur banding), sejalan dengan prinsip keadilan pemrosesan data otomatis.

## 14. Jawaban Langsung atas Pertanyaan Spesifik Anda

**"Apakah ini seperti sistem kerja Google Authenticator, yang berubah setiap rentang waktu tertentu, namun bedanya dalam bentuk QR code?"**
Ya, analoginya tepat pada intinya (time-based, secret-based, berubah berkala) — detail perbedaan teknisnya dijelaskan di Bagian 5.2 (skema Anda butuh state server, TOTP klasik tidak).

**[v2] QR per-pegawai vs 1 QR di layar besar — mana yang lebih baik?**
QR di kiosk (layar tetap kantor) yang dipindai HP pegawai — bukan sebaliknya. Ini pilihan yang lebih baik karena bukti lokasi jadi melekat pada kedekatan fisik untuk memindai (Bagian 5.2, 6.5 revisi), dan sekaligus menghilangkan kebutuhan device binding di HP pegawai.

**"Bagaimana jika akunnya diberitahukan ke temannya untuk bisa titip absen?"**
Di desain v2 (device binding pegawai dihapus), pertahanan utama sepenuhnya bertumpu pada **face recognition yang diputuskan server** (Bagian 6.2 revisi) — bukan boolean yang dipercaya dari HP. Ini menutup celah titip-HP dan titip-akun untuk kasus umum, tapi kolusi penuh (pemilik akun hadir sendiri menyerahkan HP yang sudah login ke wajah orang lain) tetap **secara teori mungkin** — sama seperti batas semua vendor lain termasuk MASOOK (Bagian 1).

**"Apakah face recognition memang bisa mencocokkan wajah tiap orang?"**
Ya untuk **matching** (Bagian 6.2 revisi). **Liveness/anti-spoofing** jauh lebih sulit dan itu bagian yang punya keterbatasan riil di solusi gratis (Bagian 6.3) — di v2, verifikasi kembali bersifat selfie-style (kamera di HP pegawai, bukan di kiosk), jadi risiko ini sedikit naik dibanding desain v1; ditambal dengan liveness challenge + fakta bahwa keputusan akhir tetap di server.

**"Fake GPS masih bisa selalu ditembus, bagaimana?"**
Benar dan dikonfirmasi riset (Bagian 2.3). Di desain v2, ini **nyaris tidak relevan lagi**: karena lokasi dibuktikan lewat kedekatan fisik memindai QR di kiosk (bukan GPS self-report HP pegawai), **tidak perlu native app untuk deteksi fake-GPS di sisi pegawai** — ini juga jawaban langsung atas pertanyaan penutup Anda soal perlu-tidaknya native app (detail lengkap Bagian 6.5 revisi).

## 15. Referensi & Sumber Riset

- Perpres No. 21 Tahun 2023 & PermenPANRB No. 4 Tahun 2025 tentang Hari dan Jam Kerja Instansi Pemerintah (baseline nasional — **verifikasi Perbup/SE Kotabaru terbaru ke BKPSDM sebelum implementasi final**, lihat Bagian 2.1)
- SE Bupati Kotabaru No. 800.1.6/369/SETDA (16 Maret 2026) — contoh kebijakan disiplin ASN terbaru era Bupati Muhammad Rusli, sebagai konteks (bukan sumber jam kerja)
- `face-api.js` (justadudewhohacks) — https://github.com/justadudewhohacks/face-api.js
- MediaPipe Face Detection/Face Mesh (Google) — https://github.com/google-ai-edge/mediapipe
- FaceRecognition-LivenessDetection-Javascript (Faceplugin-ltd) — referensi opsional liveness lanjutan
- Dokumentasi resmi kuota Google Sheets/Docs API — https://developers.google.com/workspace/sheets/api/limits
- Dokumentasi Supabase Pricing — https://supabase.com/pricing
- Dokumentasi Vercel Limits & Fair Use Policy — https://vercel.com/docs/limits
- Artikel teknis deteksi mock-location Android (`isMock`/`isFromMockProvider`) — blog.anmolthedeveloper.com
- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi

---

*Dokumen ini adalah blueprint hidup — perbarui Bagian 2.1 (regulasi jam kerja resmi) dan Bagian 4/5 (skema data & aturan) begitu Perbup/SE resmi Kotabaru diperoleh, karena seluruh sistem sengaja dirancang agar aturan bisa diubah lewat data/konfigurasi, bukan lewat penulisan ulang kode.*
