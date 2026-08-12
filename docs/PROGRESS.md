# QRensi — Progress Tracker

> Direvisi tiap sesi (biasanya lewat `/qrensi-end`). Status: ☐ belum · ◐ jalan · ☑ selesai.
> **Terakhir diperbarui:** 2026-08-09

---

## Status Global
**Fase aktif:** Fase 3 — Google & Laporan (hampir selesai) → Fase 4
**Sesi terakhir:** #12 (2026-08-10)

> ⚠️ **Tindakan user:** jalankan `supabase/migrations/0006_sanggahan.sql` (tabel sanggahan) sebelum tes fitur Izin & Sanggahan. Bucket Storage 'sanggahan' sudah dibuat.

> ℹ️ Saat deploy Vercel: tambahkan **semua** env dari `.env.local` termasuk `CRON_SECRET`
> (Vercel Cron otomatis kirim `Authorization: Bearer $CRON_SECRET`). Cron sudah di `vercel.json`.

> ✅ Schema DB live. ✅ Auth + admin CRUD jalan & terverifikasi.
> ⚠️ **Satu tindakan user:** jalankan `supabase/migrations/0004_rls_hardening.sql`
> di SQL Editor (mengaktifkan RLS deny pada tabel konfigurasi — app tetap jalan
> karena akses admin lewat service-role). Belum wajib untuk dev, wajib sebelum go-live.

## Fase 0 — Fondasi
- ☑ Sistem dokumentasi/memori (`/docs` + slash commands)
- ☑ Scaffold Next.js 16 + TS + Tailwind v4 (build hijau)
- ☑ Install dependensi utama (supabase, qrcode, face-api, googleapis, dll)
- ☑ Migration SQL lengkap: `0001_init_schema` + `0002_seed_default` + `0003_rls`
- ☑ Klien Supabase (client/server/admin) + refresh sesi via `proxy.ts`
- ☑ Struktur folder route (pegawai/kiosk/admin) + shell UI + bottom nav
- ☑ Lib pure logic: `qr-token`, `jam-kerja` (state machine), `potongan`, `kiosk-auth`
- ☑ `.env.example` + konvensi env
- ☑ **Design system "Laut"** — token OKLCH light/dark, Plus Jakarta Sans, elevasi lembut, motion spring (`docs/DESIGN.md`)
- ☑ **UI native-feel** — landing, beranda (hero status card + timeline + CTA kontekstual + live clock), bottom nav pill beranimasi + haptic, absensi/riwayat/profil, kiosk sinematik
- ☑ **PWA installable** — ikon 192/512/maskable/apple + service worker offline app-shell (produksi)
- ☐ Env: VAPID keys ✅ digenerate & masuk `.env.local`
- ☑ Auth: login (`/login`), logout (`/logout`), guard route via `lib/auth.ts` (getSesiUser/requireAdmin/requireUser). User admin dibuat (bungluyo@gmail.com, super_admin).
- ☑ Modul setting **Pola Hari Kerja** — list + tambah + hapus (server actions, service-role, guard admin)
- ☑ Modul setting **Jam Kerja Sesi** — editor jam per pola×hari×sesi (edit + toggle aktif)
- ☑ Admin dashboard mini (hitung pola/jam/pegawai/potongan)
- ☑ Beranda greeting pakai nama user login (server → client)
- ☑ RLS hardening `0004` ditulis (⚠️ user perlu run di SQL Editor)
- ☐ Deploy pertama ke Vercel (butuh kredensial user)

**Kredensial admin (sementara — ganti setelah login pertama):**
- Email `bungluyo@gmail.com` · Password `Qrensi!4803fd2e`

**Catatan teknis Fase 0:**
- Next.js **16** (bukan 15); konvensi `middleware`→`proxy.ts`.
- Tailwind **v4**. `next-pwa` DITUNDA (belum stabil di Next 16) → PWA di-handle manual: `manifest.json` + metadata + `public/sw.js` (produksi saja).
- pgvector dipakai untuk `face_embedding vector(128)` (fallback `float8[]`).
- Git remote: `https://github.com/ngluyo/qrensi.git` (privat, masih kosong — belum push).

## Fase 1 — MVP QR — ◐ (vertical slice presensi jalan)
- ☑ Modul **Pegawai** (list/tambah/hapus + assign unit & pola) + tambah unit kerja
- ☑ Registrasi **Kiosk** + generate/reset `device_secret` (ditampilkan sekali) + aktif/nonaktif/hapus
- ☑ Endpoint `POST /api/qr/generate` (auth device_secret, resolusi sesi terbuka, rotasi 60s/instan-saat-klaim) — **teruji live**
- ☑ Halaman **kiosk** tampil QR nyata (paste secret → polling → render QR + countdown)
- ☑ Endpoint `POST /api/presensi/verify` (klaim atomik + resolusi sesi per-pegawai + state machine + simpan presensi) — **klaim atomik teruji (1 dari 2)**
- ☑ Halaman **scan** di HP (html5-qrcode → verify → hasil sukses/gagal + haptic)
- ☑ Fix bug `/absensi` (Server Component + onClick → jadi Client Component)
- ☑ Kiosk **device binding** 1-secret-1-perangkat (migrasi 0005) + status "Terikat" di admin
- ☑ Cron **tutup sesi harian** (`/api/cron/tutup-sesi-harian`, vercel.json */5) — `tidak_hadir`/`tidak_ada_di_kantor`; **teruji**
- ☑ Guard verify: istirahat/pulang butuh masuk berhasil (`masuk_belum`)
- ☑ **Beranda** data nyata (sesi hari ini + status live + rekap bulan)
- ☑ **Riwayat** data nyata (kalender bulanan warna-status + ringkasan + estimasi potongan)
- ☑ Editor **aturan potongan** admin (list per jenis + tambah/hapus)
- ☐ Deploy Vercel (env + uji kamera HP) — **berikutnya**
- ☐ Face verification (Fase 2) disisipkan sebelum scan
## Akun & Peran
- ☑ Provisioning akun pegawai oleh admin (buat akun + password sementara, tampil sekali) — **teruji: create→login OK**
- ☑ 3 role: super_admin / admin_unit / pegawai (+ kiosk = device). Detail di ARCHITECTURE.
- ☐ **Utang teknis:** batasi `admin_unit` ke unitnya (kini setara super_admin) — perketat sebelum multi-unit
- ☐ Deploy: **live** di Vercel (commit f32e828) ✅

## Fase 2 — Biometrik — ◐ (face verification jalan)
- ☑ Model face-api di `public/models` (tiny + landmark68 + recognition)
- ☑ `lib/face.ts` (client descriptor), `lib/face-token.ts` (HMAC 90s), `lib/face-embedding.ts` (euclidean, threshold 0.55, pgvector helpers)
- ☑ `POST /api/face/enroll` (admin) + halaman **/admin/enrollment** (kamera → descriptor → simpan)
- ☑ `POST /api/face/verify` (server-side decision) → `face_session_token` — teruji: pgvector roundtrip (self-dist 0), 401 tanpa login
- ☑ Langkah **/absensi/wajah** sebelum scan; scan kirim face token; `presensi/verify` gating bila enrolled
- ☑ Liveness challenge dasar: kedip 2× + menoleh (EAR/yaw dari landmark) sebelum capture descriptor
- ☐ Modul Audit Log admin (dari presensi_verifikasi_log)
- ☐ Notifikasi anomali ke admin
## Fase 3 — Google & Laporan — ◐
- ☑ Modul **Audit Log** admin (presensi_verifikasi_log, filter hasil/tipe, 100 terbaru)
- ☑ **Ekspor Sheets** (`lib/google-sheets.ts` + /admin/laporan): rekap bulanan semua pegawai → tab per bulan — **teruji ke spreadsheet "Rekap QRensi"**
- ☑ Backup Google Drive (OAuth refresh token, scope drive.file, folder "QRensi Backup", CSV) — **teruji: upload nyata OK**
- ☑ Ekspor + backup **terjadwal** (`/api/cron/laporan-harian`, vercel.json 23:45 WITA) — **teruji live (sheets:ok, drive:ok)**
- ☑ **Form sanggahan/izin** pegawai (ajukan izin/sakit/cuti/dinas/sanggahan + lampiran ke Storage) + admin approve/reject (`/admin/sanggahan`) — ⚠️ **butuh migration 0006 + bucket 'sanggahan' (sudah dibuat)**
- ☐ Laporan bulanan siap cetak (PDF)
## Fase 4 — Hardening — ☐ belum mulai

---

## Blocker / Menunggu User
- Kredensial Supabase (URL, anon, service_role) — lihat SETUP_CHECKLIST.
- Google Cloud service account (Sheets/Drive) — Fase 3, belum mendesak.
- SK resmi jam kerja ASN Kotabaru — pakai default seed dulu.

## Next Session (usulan)
1. **Deploy Vercel**: import repo, isi env (termasuk CRON_SECRET), verifikasi cron, uji kamera HP (HTTPS).
2. **Fase 2 — Face:** enrollment (admin/HR) + `POST /api/face/verify` (similarity server-side) → `face_session_token`, sisipkan sebelum scan.
3. Modul **Audit Log** admin (dari `presensi_verifikasi_log`).
4. Liveness challenge dasar (kedip/menoleh).
