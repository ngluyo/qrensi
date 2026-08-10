# QRensi — Decision Log (ADR ringkas)

> Append-only. Setiap keputusan penting = 1 entri. Format: tanggal, konteks, keputusan, alasan.
> Jangan edit entri lama; jika berubah, tambah entri baru yang mereferensikan yang lama (`menggantikan ADR-XXX`).

---

### ADR-0001 — Brand & nama proyek: "QRensi"
- **Tanggal:** 2026-08-09
- **Keputusan:** Nama aplikasi & package = `QRensi` (dari nama folder). Tagline: "Presensi ASN Kotabaru".
- **Alasan:** Brand pendek & khas; blueprint dipakai sebagai dokumen riset, bukan nama produk.

### ADR-0002 — Scaffold di root folder `QRensi/`
- **Tanggal:** 2026-08-09
- **Keputusan:** Proyek Next.js di root folder ini, berdampingan dengan `blueprint-*.md` dan `docs/`.
- **Alasan:** Paling simpel untuk git & Vercel; belum butuh monorepo.

### ADR-0003 — Sistem memori lintas-sesi berbasis `/docs` + slash command
- **Tanggal:** 2026-08-09
- **Keputusan:** Dokumen hidup (`PRD`, `ARCHITECTURE`, `DECISIONS`, `PROGRESS`, `SESSION_LOG`, `SETUP_CHECKLIST`) di `/docs`, dikelola lewat perintah `/qrensi-start` & `/qrensi-end` (`.claude/commands/`).
- **Alasan:** Proyek panjang & bertahap lintas sesi; konteks harus bisa direkonstruksi dari file, bukan ingatan chat.

### ADR-0004 — Ikuti arah alur v2 blueprint (kiosk tampil QR, HP scan)
- **Tanggal:** 2026-08-09
- **Keputusan:** Adopsi penuh desain v2: QR di kiosk, HP pegawai memindai; face verify server-side; device binding di kiosk; tanpa GPS self-report HP.
- **Alasan:** Bukti lokasi lebih kuat (kedekatan fisik), menghapus masalah device binding HP & fake-GPS untuk alur utama. PWA cukup.

### ADR-0015 — Cron tutup-sesi jadi 1×/hari (batas Vercel Hobby)
- **Tanggal:** 2026-08-10
- **Keputusan:** Vercel Hobby membatasi cron maksimal 1×/hari, jadi `vercel.json` diubah dari `*/5` ke `30 15 * * *` (15:30 UTC = **23:30 WITA**) — setelah sesi pulang tutup, masih di tanggal sama. `tutup-sesi-harian` idempoten & mengevaluasi semua sesi yang sudah lewat, jadi 1 run malam cukup menandai `tidak_hadir`/`tidak_ada_di_kantor` seharian.
- **Alasan:** Absen nyata pegawai tercatat real-time saat scan; cron hanya finalisasi yang tidak hadir → tak perlu sering. Untuk finalisasi lebih real-time (opsional): pakai cron eksternal gratis (cron-job.org) memanggil endpoint dgn header CRON_SECRET, atau upgrade Vercel Pro.

### ADR-0014 — Face verification: descriptor di client, keputusan di server, gating bertahap
- **Tanggal:** 2026-08-10
- **Keputusan:** Model face-api (@vladmandic) di `public/models` (tiny_face_detector + landmark68 + recognition). HP hitung descriptor 128-d; `POST /api/face/verify` menghitung euclidean distance vs embedding tersimpan (threshold 0.55) & menerbitkan `face_session_token` (HMAC, 90s, namespace "face:"+QR_SIGNING_SECRET). Embedding disimpan pgvector `vector(128)` (literal `[...]`), dibaca & dibandingkan di JS. `presensi/verify` mewajibkan face token **hanya bila pegawai sudah enroll** (rollout bertahap; belum enroll = dilewati). Enrollment oleh admin (`/admin/enrollment`).
- **Alasan:** Keputusan tak boleh di client (bisa dimanipulasi). Gating bersyarat memungkinkan go-live sebelum semua pegawai ter-enroll. Liveness challenge (kedip/menoleh) belum diimplementasi — follow-up; risiko spoofing foto masih ada (blueprint §6.3).

### ADR-0013 — Kiosk: binding 1-secret-ke-1-perangkat (device_instance_id)
- **Tanggal:** 2026-08-10
- **Keputusan:** Kiosk membuat `device_instance_id` (UUID acak di localStorage) dan mengirimnya tiap generate. Perangkat pertama mengunci binding di `perangkat_kiosk.device_instance_id`; perangkat lain dengan secret sama ditolak (409 `kiosk_terikat_perangkat_lain`). "Reset secret" admin melepas binding. Migrasi `0005`.
- **Alasan:** Menjawab risiko secret bocor/dipakai di perangkat lain (termasuk relay QR jarak jauh). Bukan hardware-attestation penuh, tapi menaikkan biaya kecurangan; pertahanan identitas utama tetap face verification (Fase 2). Koordinat GPS kiosk tetap tidak dipakai untuk verifikasi (lokasi dibuktikan oleh kedekatan fisik memindai) — memindahkan kiosk dalam kantor tidak berpengaruh.

### ADR-0012 — Kiosk rotasi via polling `qr/generate`, bukan Realtime
- **Tanggal:** 2026-08-10
- **Keputusan:** Kiosk polling `POST /api/qr/generate` tiap ~3 detik. Server mengembalikan token aktif yang ada; jika token diklaim (status≠aktif) atau umur >60 detik → terbitkan token baru. Tidak memakai Supabase Realtime.
- **Alasan:** `qr_token` RLS default-deny → anon (kiosk) tak bisa subscribe Realtime. Polling lebih sederhana, tetap memberi rotasi instan-saat-klaim + fallback 60 detik (blueprint §5.2 sebut polling sebagai fallback sah). Realtime bisa ditambah nanti bila perlu.

### ADR-0011 — Token = bukti kehadiran; sesi diresolusi per-pegawai saat verify
- **Tanggal:** 2026-08-10
- **Keputusan:** Token QR kiosk membuktikan kedekatan fisik + kesegaran (nonce+TTL). SESI presensi ditentukan saat verify dari pola pegawai + waktu WITA (bukan dari token). `qr_token.sesi_absensi_harian_id` diisi sesi pola pertama yang terbuka (memenuhi NOT NULL) namun bersifat informational.
- **Alasan:** 1 kiosk melayani semua pola yang jendela sesinya berbeda; resolusi per-pegawai membuat 1 QR bekerja untuk semua pola tanpa menampilkan banyak QR. Menghindari migrasi skema.

### ADR-0010 — Akses tabel konfigurasi hanya via server (service-role) + RLS deny
- **Tanggal:** 2026-08-10
- **Keputusan:** Tabel konfigurasi/operasional (instansi, unit_kerja, pola_hari_kerja, jam_kerja_sesi, dst) di-enable RLS tanpa policy (default deny). Semua baca/tulis admin lewat **server actions memakai service-role** (`createAdminClient`), digating `requireAdmin()`. Client anon tidak pernah menyentuh tabel ini langsung.
- **Alasan:** anon key ada di bundle publik; tanpa RLS, tabel bisa ditulis siapa saja. Pola server-action lebih sederhana & aman daripada menulis policy granular per-peran sekarang.

### ADR-0009 — Peran ditentukan oleh tabel `admin_unit_kerja`
- **Tanggal:** 2026-08-10
- **Keputusan:** User = admin jika punya baris di `admin_unit_kerja` (`super_admin` atau `admin_unit`). `super_admin` tetap butuh 1 `unit_kerja` (skema NOT NULL) sebagai unit rumah, tapi lihat semua via RLS/EXISTS. User admin pertama dibuat via script service-role (auth user + pegawai + admin_unit_kerja).
- **Alasan:** sederhana, sejalan RLS blueprint §11.1; menghindari tabel peran terpisah.

### ADR-0008 — PWA di-handle manual (service worker sendiri)
- **Tanggal:** 2026-08-10
- **Keputusan:** Karena `next-pwa` ditunda (ADR-0006), buat `public/sw.js` sendiri (network-first navigasi, cache-first aset) + registrasi produksi-saja via `sw-register.tsx`. Ikon PWA digenerate dengan `sharp` dari glyph QRensi.
- **Alasan:** Installable + offline app-shell tanpa dependency yang belum stabil; dev tidak ter-cache.

### ADR-0007 — Design system "Laut" (identitas maritim Kotabaru)
- **Tanggal:** 2026-08-10
- **Keputusan:** Tipografi **Plus Jakarta Sans** (typeface Indonesia). Palette OKLCH light/dark: brand ocean-blue + accent teal, semantik success/warning/info/danger. Radius besar, elevasi lembut (bukan border), motion easing spring `cubic-bezier(0.32,0.72,0,1)`, haptic pada aksi. Detail di `docs/DESIGN.md`.
- **Alasan:** Target "native, modern, bukan AI slop" + resonansi lokal (Pulau Laut) + aksesibilitas untuk ASN lintas usia.

### ADR-0006 — Next.js 16 + tunda `next-pwa`
- **Tanggal:** 2026-08-09
- **Keputusan:** Pakai Next.js 16 (hasil `create-next-app` terbaru) + Tailwind v4. Konvensi middleware pakai `src/proxy.ts`. **Tunda** plugin `next-pwa`; PWA cukup via `manifest.json` + metadata dulu, service worker menyusul.
- **Alasan:** `next-pwa` belum stabil di Next 16; menghindari blocker build. Blueprint menyebut Next 15, tapi 16 kompatibel untuk kebutuhan kita.

### ADR-0005 — Jam kerja & aturan sebagai data, bukan hardcode
- **Tanggal:** 2026-08-09
- **Keputusan:** Seluruh jam/pola/mode jendela disimpan di tabel & diedit via UI admin; perubahan tidak retroaktif.
- **Alasan:** Regulasi jam kerja Kotabaru belum final (SK resmi belum diperoleh) dan sudah berubah beberapa kali; harus fleksibel tanpa ubah kode.
