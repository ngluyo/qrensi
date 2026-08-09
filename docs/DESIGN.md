# QRensi — Design System & UX Direction

> Living doc. Tujuan: PWA yang terasa **native**, modern, tepercaya — bukan "AI slop".
> Terakhir diperbarui: 2026-08-09

---

## 1. Positioning & Prinsip

QRensi dipakai ASN (termasuk pegawai senior, HP kelas menengah, koneksi tak selalu bagus) untuk satu pekerjaan harian: **"apakah saya sudah absen?"**. Maka desain harus:

1. **Tenang & tepercaya** — ini aplikasi pemerintah yang menyentuh tunjangan. Warna kalem, kontras tinggi, tidak ramai.
2. **Satu aksi jelas per layar** — status besar, tombol utama yang labelnya berubah sesuai konteks ("Absen Masuk" → "Sudah Masuk ✓ · Absen Pulang 16:30").
3. **Native, bukan web** — bottom nav pill, bottom sheet (bukan modal tengah), transisi spring, ripple/haptic, safe-area, pull-to-refresh.
4. **Aksesibel** — target sentuh ≥48px, kontras WCAG AA, tipografi besar & lega.
5. **Disiplin visual** — 1 warna brand + neutral, elevation lembut (bukan border tipis di mana-mana), radius besar konsisten.

**Anti-slop checklist:** hindari gradient ungu-biru default, emoji berlebihan, glassmorphism asal, ikon acak, spacing tidak konsisten, teks generik. Setiap layar punya hierarki & satu "hero moment".

## 2. Identitas Visual

- **Tipografi:** **Plus Jakarta Sans** (typeface buatan Indonesia/Tokotype — resonansi lokal + geometris modern). Berat: 400/500/600/700/800. Angka tabular untuk jam & rekap.
- **Warna brand — "Laut"** (Kotabaru = Pulau Laut, identitas maritim): biru-laut dalam sebagai primary, cyan-teal sebagai aksen interaktif.
  - `brand` (primary/tekan): deep ocean blue
  - `accent` (highlight, aktif): teal/cyan
  - Semantik: `success` emerald (hadir/tepat waktu), `warning` amber (terlambat), `info` blue (tidak di kantor), `danger` rose (alpa/ditolak)
- **Elevation:** shadow lembut berlapis (bukan garis), radius 16–28px untuk card & sheet.

Token warna & bentuk didefinisikan di `src/app/globals.css` (light + dark, OKLCH).

## 3. Pola Komponen (native-feel)

| Komponen | Catatan |
|---|---|
| **AppBar** | Judul + aksi kanan; menyatu dengan konten (bukan bar tebal ala web) |
| **Bottom Nav** | 4 tab, indikator pill beranimasi, ikon line, haptic saat pindah |
| **Status Card** | Hero beranda: timeline 3 sesi (masuk/istirahat/pulang) dengan state live |
| **Primary CTA** | Tombol besar kontekstual; label & warna ikut status |
| **Bottom Sheet** | Untuk detail/konfirmasi (framer-motion drag), bukan dialog tengah |
| **Skeleton** | Loading pakai skeleton, bukan spinner |
| **Chip status** | Warna semantik + ikon; teks Indonesia jelas |

Motion: easing `cubic-bezier(0.32,0.72,0,1)` (spring-ish iOS), durasi 200–320ms, `prefers-reduced-motion` dihormati.

## 4. Alur Layar Utama

- **Beranda:** salam + jam sekarang → **Status Card** (3 sesi timeline) → CTA kontekstual → ringkas rekap bulan (mini).
- **Absensi (full-screen, camera-first):** langkah berurut dgn progress dots — (1) verifikasi wajah, (2) scan QR kiosk — transisi spring antar langkah, feedback sukses haptik + centang beranimasi.
- **Riwayat:** kalender bulanan warna-status + ringkasan potongan; ketuk hari → bottom sheet detail.
- **Profil:** identitas, enrollment wajah, pengaturan, logout.
- **Kiosk (dark, sinematik):** QR besar tengah, ambient halus, ticker "baru absen" real-time, jam & nama kantor.
- **Admin (desktop-first, tetap rapi di mobile):** sidebar modul, tabel bersih, form time-picker untuk jam kerja.

## 5. Referensi Rasa (bukan untuk ditiru mentah)

Neobank/super-app modern (kejelasan status & CTA), Material You (elevation & shape), iOS (motion & sheet). Pemerintahan tetapi *human* — hangat, jelas, tidak birokratis.
