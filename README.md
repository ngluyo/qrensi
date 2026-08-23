# QRensi

Aplikasi presensi berbasis **QR dinamis + verifikasi wajah**, dirancang agar
sulit dititipkan namun tetap mudah dipakai dari HP mana pun.

Dibangun untuk berjalan sepenuhnya di **paket gratis** (Supabase + Vercel), dan
dapat **direplikasi oleh organisasi mana pun** — pemerintah daerah, perusahaan,
sekolah, atau yayasan — dengan identitas sendiri tanpa mengubah kode.

## Cara kerja singkat

1. Layar **kiosk** di kantor menampilkan QR yang berganti terus.
2. Pegawai membuka aplikasi di HP → **verifikasi wajah** (diputuskan di server).
3. Pegawai **memindai QR kiosk** → kehadiran tercatat.

Karena QR harus dipindai dari jarak dekat, kehadiran fisik terbukti tanpa
mengandalkan GPS — sehingga *fake GPS* tidak relevan. Token QR sekali pakai
dengan klaim atomik, jadi tidak bisa dipakai dua orang.

## Fitur

**Pegawai** — absen 3 sesi harian, riwayat kalender dengan rincian per hari,
rekap & estimasi potongan, pengajuan izin/sakit/cuti/dinas beserta lampiran,
edit data pribadi & foto profil, notifikasi.

**Admin** — dashboard kehadiran harian, kelola pegawai & akun, enrollment wajah,
pengaturan pola & jam kerja, aturan potongan berjenjang, kelola kiosk,
persetujuan izin, audit log, ekspor Google Sheets, cadangan Google Drive,
laporan siap cetak, manajemen peran berjenjang (Super Admin / Admin unit).

**Teknis** — PWA yang dapat dipasang di layar utama, tema terang/gelap,
rate limiting, RLS, audit trail, deteksi *liveness* (kedip & menoleh).

## Memulai

📘 **[Panduan Instalasi lengkap →](docs/INSTALASI.md)**

Ringkasnya:

```bash
git clone https://github.com/ngluyo/qrensi.git && cd qrensi && npm install
```

1. Buat project **Supabase**, jalankan `supabase/SETUP.sql` di SQL Editor
2. Buat 4 bucket Storage: `avatar`, `sanggahan`, `branding`, `wajah` (private)
3. Salin `.env.example` → `.env.local`, isi kunci Supabase
4. Buat admin pertama:
   ```bash
   node scripts/buat-admin.mjs admin@organisasi.id "Nama Admin"
   ```
5. Jalankan:
   ```bash
   npm run dev
   ```

## Menyesuaikan identitas

Masuk sebagai Super Admin → **Panel Admin → Pengaturan Aplikasi** untuk mengubah
nama aplikasi, nama organisasi, tagline, logo, warna, dan zona waktu. Perubahan
langsung berlaku ke seluruh antarmuka termasuk nama & ikon PWA.

## Uji

```bash
npm test
```

## Dokumentasi

| Berkas | Isi |
|---|---|
| [`docs/INSTALASI.md`](docs/INSTALASI.md) | Panduan pemasangan langkah demi langkah |
| [`docs/PERAN.md`](docs/PERAN.md) | Peran pengguna & batas kewenangan |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arsitektur teknis |
| [`docs/PRD.md`](docs/PRD.md) | Spesifikasi produk |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Sistem desain |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Catatan keputusan arsitektur |

## Teknologi

Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) ·
face-api.js · Vercel

## Catatan kepatuhan

Data wajah termasuk **data pribadi bersifat spesifik** menurut UU No. 27/2022
tentang Pelindungan Data Pribadi. Sebelum dipakai secara luas, pastikan ada
persetujuan tertulis pegawai saat enrollment, mekanisme penghapusan data, dan
jalur sanggahan yang ditangani manusia. Foto profil sengaja dipisahkan dari data
biometrik agar pemakaiannya tidak melampaui tujuan yang disetujui.
