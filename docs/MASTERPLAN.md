# QRensi — Masterplan Pembangunan Ulang (v1, 2026-08-22)

> **Dokumen induk.** Menyatukan hasil `AUDIT.md` + `RESEARCH.md` jadi rencana kerja bertahap.
> Aturan: kerjakan **berurutan per Tahap**; jangan mulai tahap berikutnya sebelum *Definition of Done* (DoD) tahap sekarang terpenuhi.
> Setiap tahap ditutup dengan: build hijau → uji → update `PROGRESS.md` → commit.

---

## 0. Keputusan strategis

### 0.1 Restrukturisasi, BUKAN tulis ulang dari nol
**Keputusan:** pertahankan fondasi yang sudah terbukti (skema DB, klaim token atomik, rotasi QR, state machine, cron, integrasi Google, design system), **rombak lapisan aplikasi** (auth flow, modul admin, kamera, IA/UX).

**Alasan:** audit §C menunjukkan fondasi sudah teruji nyata (klaim atomik 1-dari-2, ekspor Sheets, backup Drive, cron). Menulis ulang dari nol membuang aset teruji itu dan mengulang risiko yang sudah dilewati, tanpa memperbaiki akar masalah yang sebenarnya ada di lapisan aplikasi. Yang **dirombak total**: modul Pegawai, alur akun/password, alur kamera, navigasi & IA.

### 0.2 Mobile-first, rasa native
Semua layar dirancang **HP dulu** (target utama pemakaian), desktop menyesuaikan. Pola native: bottom nav, bottom sheet, transisi spring, haptic, skeleton, safe-area, pull-to-refresh.

### 0.3 Android: TWA, bukan Capacitor
QRensi memakai Server Actions/SSR → **static export tidak memungkinkan** → Capacitor tidak cocok. Untuk APK/Play Store gunakan **TWA (Bubblewrap)** yang membungkus PWA live. (Riset §3.)

### 0.4 Prinsip kerja
1. **Tidak ada fitur baru sebelum P0 beres.**
2. Setiap perubahan **diverifikasi** (build + uji nyata), bukan diasumsikan.
3. Logika kritis punya **unit test**.
4. Setiap keputusan → ADR di `DECISIONS.md`.
5. Setiap tahap selesai → **deploy & minta user uji**.

---

## Tahap 1 — Pemadaman Kebakaran (P0) 🔥
**Tujuan:** aplikasi bisa dipakai tanpa jalan buntu.

| # | Pekerjaan | DoD |
|---|---|---|
| 1.1 | **Fix logout** → redirect **303** | Klik Keluar dari admin & pegawai → mendarat di `/login` (200), tidak 405 |
| 1.2 | **Deploy tertinggal** (commit `54b9258`) | Push berhasil; Vercel build hijau; `/ganti-password` hidup di produksi |
| 1.3 | **Fix kamera**: minta izin **sebelum** muat model; init backend TF + fallback WASM; error asli tampil | Enrollment & verifikasi wajah **berhasil di PC berkamera** dan di HP |
| 1.4 | **Halaman "Akun Saya"** (semua peran): ganti password mandiri | Admin & pegawai bisa ganti password sendiri dari dalam app |
| 1.5 | Verifikasi paksa-ganti-password jalan di produksi | Login pertama pegawai → dipaksa ke `/ganti-password` |

**Keluaran:** aplikasi layak diuji end-to-end tanpa terkunci.

---

## Tahap 2 — Modul Pegawai & Manajemen Akun (rombak total)
**Tujuan:** siklus hidup pegawai lengkap; admin punya kendali penuh.

| # | Pekerjaan | DoD |
|---|---|---|
| 2.1 | **Daftar pegawai** baru: pencarian (nama/NIP), filter (unit, status, punya akun), paginasi, badge status | Cari & filter bekerja pada ≥3 data uji |
| 2.2 | **Halaman detail pegawai** `/admin/pegawai/[id]` | Menampilkan profil, akun, status wajah, ringkasan presensi |
| 2.3 | **Edit profil pegawai** (nama, NIP, jabatan, unit, pola, status kepegawaian) | Perubahan tersimpan & terlihat |
| 2.4 | **Aksi akun di detail**: buat akun, reset password, aktif/nonaktif | Semua aksi berfungsi + kredensial tampil sekali |
| 2.5 | **Enrollment wajah dari detail pegawai** | Bisa enroll/ulang dari halaman pegawai |
| 2.6 | **Manajemen admin**: tunjuk/cabut `admin_unit` & `super_admin` (khusus super admin) | Bisa menunjuk admin tanpa SQL |
| 2.7 | **Scoping `admin_unit`** benar-benar dibatasi ke unitnya | Admin unit hanya melihat/mengubah pegawai unitnya |

---

## Tahap 3 — Pengalaman Pegawai (mobile-native)
| # | Pekerjaan | DoD |
|---|---|---|
| 3.1 | **Onboarding pertama** (3 langkah: ganti password → enroll wajah → izin notifikasi) | Pegawai baru dituntun sampai siap absen |
| 3.2 | **Alur absensi disempurnakan**: status jelas, error ramah, retry, haptic | Semua kondisi gagal punya pesan & jalan keluar |
| 3.3 | **Riwayat interaktif**: ketuk tanggal → bottom sheet detail (jam aktual per sesi) | Detail harian tampil |
| 3.4 | **Profil/self-service**: data diri, ganti password, notifikasi, enrollment ulang | Lengkap |
| 3.5 | **Empty/loading/error state** konsisten (skeleton) | Tak ada layar "menggantung" |
| 3.6 | **Install prompt** PWA + panduan iOS | Muncul bila belum terpasang |

---

## Tahap 4 — Integritas Data & Kepatuhan
| # | Pekerjaan | DoD |
|---|---|---|
| 4.1 | **Sanggahan mengubah presensi**: disetujui → status presensi diperbarui (mis. alpa→izin) | Rekap ikut berubah |
| 4.2 | **Status presensi tambahan**: `izin`, `sakit`, `cuti`, `dinas_luar` (migrasi) | Muncul di kalender & rekap |
| 4.3 | **Audit log aksi admin** (ubah jam kerja/potongan/hapus pegawai/reset password) | Terekam & bisa ditelusuri |
| 4.4 | **Unit test** logika kritis (jam-kerja, potongan, qr-token, tutup-sesi) | `npm test` hijau |
| 4.5 | **Tipe DB otomatis** (`database.types.ts`) | Cast manual berkurang |

---

## Tahap 5 — Dashboard & Laporan Lanjutan
| # | Pekerjaan | DoD |
|---|---|---|
| 5.1 | **Dashboard admin**: kehadiran hari ini, tren mingguan, top telat, pola "tidak di kantor" | Grafik tampil dari data nyata |
| 5.2 | **Laporan per pegawai** (PDF) + per unit | Bisa dicetak |
| 5.3 | **Filter periode** (bukan hanya bulan berjalan) | Pilih rentang tanggal |

---

## Tahap 6 — Pengerasan & Rilis
| # | Pekerjaan | DoD |
|---|---|---|
| 6.1 | Rate limit **persisten** (Upstash) | Efektif lintas instance |
| 6.2 | **Security headers** (CSP, X-Frame-Options, dll) sesuai panduan Next.js | Terpasang |
| 6.3 | Halaman **404/error** kustom | Ramah |
| 6.4 | **Uji beban** simulasi jam sibuk | Laporan hasil |
| 6.5 | **TWA/Bubblewrap** → APK Android | APK terpasang & jalan |
| 6.6 | **Dokumen serah terima**: panduan admin, panduan pegawai, SOP kiosk | Siap sosialisasi |

---

## Rencana pengujian (ringkas — detail di `QA_CHECKLIST.md`)
Tiap tahap wajib lulus: **alur admin** (login→kelola→laporan), **alur pegawai** (login→ganti password→enroll→absen→riwayat→izin), **alur kiosk** (setup→tampil QR→rotasi), di **HP dan desktop**.

## Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| Liveness gratis bisa ditembus video | Perkuat challenge; andalkan bukti fisik kiosk; audit trail; kebijakan disiplin |
| Kuota free tier terlampaui | Pantau; arsip log >90 hari; kompresi foto |
| Regulasi jam kerja berubah | Semua jam = data, bukan kode (sudah) |
| Push iOS terbatas | Wajib install ke home screen; sediakan fallback in-app |
| Vercel Hobby (2 cron, 1×/hari) | Cron eksternal bila perlu reminder |
