# QRensi — Audit Menyeluruh (2026-08-22)

> Hasil penelusuran kode + pengujian produksi (`qrensi.vercel.app`) + laporan uji user.
> Setiap temuan: gejala → **akar masalah terbukti** → dampak → perbaikan.
> Severity: **P0** (blokir pemakaian) · **P1** (fungsi penting rusak) · **P2** (kualitas/UX) · **P3** (nice-to-have).

---

## A. Temuan dari pengujian user

### A1 · [P0] Tombol "Keluar" → halaman error
- **Gejala:** klik Keluar → diarahkan ke `/login` tapi "page is not working".
- **Akar masalah (TERBUKTI):** `src/app/logout/route.ts` memakai `NextResponse.redirect()` yang **default 307**. Status 307 **mempertahankan method POST**, sehingga browser mengirim **POST ke `/login`**. Halaman `/login` hanya menerima GET → **405 Method Not Allowed**.
- **Bukti produksi:**
  - `POST /logout` → `status=307 location=/login`
  - `POST /login` → `405`
  - `GET /login` → `200` (halaman sendiri sehat)
- **Perbaikan:** redirect dengan **status 303 (See Other)** — 303 memaksa browser memakai GET. Alternatif: pakai server action + `redirect()` Next.js (otomatis 303 untuk form).

### A2 · [P0] Paksa ganti password tidak muncul; admin tak bisa ganti password
- **Gejala:** pegawai login pertama langsung masuk, tak diminta ganti password. Admin tak punya menu ganti password.
- **Akar masalah (TERBUKTI):** fitur ini **ada di kode lokal** (commit `54b9258`) tetapi **push ke GitHub GAGAL** ("Repository not found") → **Vercel tidak pernah membangun versi itu**. Produksi masih berjalan di commit `8f93ba0` yang belum punya `must_change_password`, halaman `/ganti-password`, maupun tombol reset.
- **Dampak tambahan:** karena password sementara sekali pakai tak pernah diganti, akun bisa terkunci saat lupa (persis kekhawatiran user).
- **Perbaikan:** selesaikan push/deploy; **plus** tambahkan menu "Ganti kata sandi" untuk **semua** peran (termasuk admin) di halaman profil/akun.

### A3 · [P0] Kamera tidak terbuka (enrollment & verifikasi wajah), izin tak diminta
- **Gejala:** di PC (berkamera), kamera gagal terbuka dan **prompt izin browser tidak pernah muncul**.
- **Akar masalah (TERBUKTI dari kode):** di **kedua** halaman kamera, urutannya salah:
  ```
  await loadFaceModels();                       // ← 7MB model + init TensorFlow.js
  const stream = await getUserMedia({...});      // ← baru minta kamera
  ```
  Jika `loadFaceModels()` **gagal atau menggantung** (isu klasik face-api: backend WebGL tak tersedia/gagal init → error "highest priority backend not yet initialized"), maka `getUserMedia()` **tidak pernah dipanggil** → **prompt izin tak pernah muncul**. Gejala user cocok persis.
  - File: `src/app/(admin)/admin/enrollment/enrollment-client.tsx:35-36`, `src/app/(pegawai)/absensi/wajah/page.tsx:52-53`.
- **Bukti pendukung:** file model **tersedia** di produksi (manifest & .bin → HTTP 200), jadi bukan masalah aset hilang; kegagalan ada di inisialisasi backend/parse.
- **Jawaban untuk pertanyaan user:** **PC berkamera SEHARUSNYA bisa** — `getUserMedia` jalan di desktop Chrome asal HTTPS (produksi sudah HTTPS). Jadi ini **bug kita**, bukan keterbatasan PC.
- **Perbaikan:** (1) **minta kamera DULU** (prompt langsung muncul), baru muat model; (2) inisialisasi backend TF eksplisit + **fallback WASM** bila WebGL gagal; (3) tampilkan **pesan error asli** + tombol coba lagi; (4) `facingMode` sebagai *preferensi* (`ideal`), bukan paksaan, agar webcam PC tetap terpakai.

### A4 · [P1] Modul Pegawai: tidak bisa diklik/diedit, semua tampil bercampur
- **Gejala:** klik nama pegawai tidak melakukan apa-apa; tak ada edit profil; semua pegawai muncul sekaligus tanpa penyaringan.
- **Akar masalah:** modul memang **belum punya** halaman detail/edit — hanya list + tambah + hapus. Tidak ada pencarian, filter unit, atau paginasi.
- **Klarifikasi jujur (bukan kebocoran data):** saat ini basis data hanya berisi **1 instansi, 2 unit kerja, 3 pegawai**. Jadi "semua pegawai muncul" **bukan** kebocoran lintas-instansi — query sudah difilter `instansi_id`. Yang kurang adalah **arsitektur informasi**: penyaringan per unit, pencarian, dan halaman detail.
- **Perbaikan:** rombak modul jadi: daftar dengan **pencarian + filter unit + paginasi**, **halaman detail pegawai** (profil, akun, enrollment wajah, riwayat presensi, reset password, aktif/nonaktif).

---

## B. Temuan tambahan dari audit kode (belum dilaporkan user)

| # | Sev | Temuan | Akar masalah / dampak |
|---|-----|--------|------------------------|
| B1 | P1 | **Peran `admin_unit` = super_admin** | Semua halaman admin terbuka untuk kedua peran; action difilter per-instansi, bukan per-unit. Berisiko saat multi-unit. |
| B2 | P1 | **Tidak ada UI kelola admin** | Tak ada cara menunjuk/mencabut admin unit dari aplikasi; harus lewat SQL. |
| B3 | P1 | **Enrollment wajah hanya via admin** | Pegawai tak bisa self-enroll terpandu; antrean menumpuk di admin. Perlu keputusan kebijakan. |
| B4 | P1 | **Tidak ada halaman "akun saya"** | Tak ada ganti password/lihat profil untuk user manapun (terkait A2). |
| B5 | P2 | **Error handling tipis** | Banyak action gagal diam-diam (`return` tanpa pesan) — mis. `createPegawai`, `updateJamSesi`. User tak tahu kenapa gagal. |
| B6 | P2 | **Tidak ada empty/loading state konsisten** | Sebagian halaman tak punya skeleton; terasa "menggantung". |
| B7 | P2 | **Rate limit in-memory** | Di serverless memori per-instance → tidak efektif lintas instance. Perlu Upstash bila serius. |
| B8 | P2 | **Belum ada unit test** | Logika kritis (state machine jam kerja, potongan, klaim token) hanya diuji manual/skrip ad-hoc. |
| B9 | P2 | **Kiosk: tak ada indikator sisa waktu QR** | Pengguna tak tahu kapan QR berganti. |
| B10 | P2 | **Riwayat: tanggal tak bisa diklik** | Tak ada detail per hari (jam masuk/pulang aktual). |
| B11 | P3 | **Belum ada `database.types.ts`** | Query pakai `as never`/cast manual; rawan salah ketik. |
| B12 | P3 | **Belum ada halaman 404/error kustom** | Error runtime tampil mentah. |
| B13 | P2 | **Tidak ada log audit untuk aksi admin** | Perubahan jam kerja/potongan/hapus pegawai tak terekam — padahal berdampak pada tunjangan. |
| B14 | P2 | **Sanggahan tidak mengubah status presensi** | Disetujui tapi rekap tetap "alpa" → laporan tidak akurat. |

---

## C. Yang sudah TERBUKTI BEKERJA (jangan dibongkar)

Ini penting agar rebuild tidak membuang yang sudah benar:

- ✅ **Skema DB & migrasi** (0001–0007) — struktur solid, multi-tenant sejak awal.
- ✅ **Klaim token atomik** — teruji: 1 pemenang dari 2 request bersamaan (anti double-absen).
- ✅ **Rotasi QR** (instan saat klaim + fallback 60 dtk) — teruji live.
- ✅ **State machine jam kerja** & perhitungan potongan — logika murni, mudah diuji.
- ✅ **Cron tutup sesi harian** — teruji menandai `tidak_hadir`.
- ✅ **Integrasi Google Sheets** — teruji tulis nyata ke "Rekap QRensi".
- ✅ **Backup Google Drive (OAuth)** — teruji upload nyata.
- ✅ **Device binding kiosk** — 1 secret ↔ 1 perangkat.
- ✅ **Design system "Laut"** + PWA installable (ikon, service worker, push).

---

## D. Kesimpulan audit

Masalah QRensi **bukan pada fondasi** (skema, alur QR, integrasi — semuanya teruji), melainkan pada **lapisan aplikasi**: alur autentikasi belum tuntas, modul admin belum lengkap (CRUD/IA), penanganan kamera salah urutan, dan deploy tertinggal.

**Rekomendasi: BUKAN tulis ulang dari nol.** Menulis ulang akan membuang komponen yang sudah terbukti benar dan mengulang risiko yang sudah kita lewati. Yang tepat adalah **restrukturisasi terarah** — perbaiki P0, rombak modul admin & alur akun, rapikan UX mobile-native — dengan rencana bertahap di `MASTERPLAN.md`.
