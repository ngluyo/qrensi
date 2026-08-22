# QRensi — Session Log

> Append-only. Satu entri per sesi. Ditulis saat `/qrensi-end` (dan dibuka `/qrensi-start`).

---

## Sesi #1 — 2026-08-09
**Tujuan:** Baca blueprint, sepakati arah, bangun sistem memori + mulai Fase 0.

**Yang dikerjakan:**
- Membaca `blueprint-presensi-asn-kotabaru.md` (v2.0) lengkap.
- Keputusan: brand QRensi, scaffold di root, Fase 0 penuh (ADR-0001..0005).
- Membangun sistem dokumentasi/memori: `docs/{PRD,ARCHITECTURE,DECISIONS,PROGRESS,SESSION_LOG,SETUP_CHECKLIST}.md`.
- Membuat slash command `/qrensi-start` & `/qrensi-end`.
- (berlanjut) Scaffold Next.js Fase 0.

**Keputusan baru:** ADR-0001 s/d ADR-0005.

**Blocker:** menunggu kredensial Supabase dari user untuk wiring & deploy.

**Next:** selesaikan scaffold, install deps, migration SQL + seed, modul setting jam kerja.

---

## Sesi #2 — 2026-08-10
**Tujuan:** Wiring kredensial, VAPID, git remote; bangun design system native-feel + PWA installable.

**Yang dikerjakan:**
- `.env.local` terisi user; generate VAPID keys → masuk `.env.local`.
- Git remote di-set ke `github.com/ngluyo/qrensi.git` (privat, kosong).
- Cek DB: schema **belum** di-apply → buat `supabase/APPLY_ALL.sql` (gabungan 3 migration) untuk dijalankan user.
- **Design system "Laut"** (ADR-0007): Plus Jakarta Sans, token OKLCH light/dark, elevasi lembut, motion spring, `docs/DESIGN.md`.
- Rebuild UI native-feel: landing, beranda (hero status card + timeline + CTA kontekstual + live clock WITA), bottom nav pill beranimasi + haptic, absensi/riwayat/profil, kiosk sinematik. Diverifikasi via preview (render benar).
- **PWA installable** (ADR-0008): ikon 192/512/maskable/apple (sharp), `public/sw.js` + registrasi produksi.
- Build hijau di setiap tahap.

**Keputusan baru:** ADR-0007 (design system), ADR-0008 (PWA manual).

**Blocker:** `supabase/APPLY_ALL.sql` belum dijalankan user → memblokir auth & CRUD.

**Next:** gen types → auth/login → admin CRUD jam-kerja & pola → data nyata di beranda.

---

## Sesi #3 — 2026-08-10
**Tujuan:** Tuntaskan Fase 0 — auth, user admin, modul setting (pola & jam kerja).

**Yang dikerjakan:**
- User admin dibuat via script service-role: auth user `bungluyo@gmail.com` (password sementara `Qrensi!4803fd2e`) + `unit_kerja` default "Sekretariat Daerah" + baris `pegawai` + `admin_unit_kerja` super_admin.
- **Auth:** `lib/auth.ts` (getSesiUser/requireAdmin/requireUser), `/login` (client), `/logout` (route), guard di layout admin & pegawai. Diverifikasi via API: login OK → peran super_admin.
- **Admin CRUD** (server actions service-role, guard admin): Pola Hari Kerja (list/tambah/hapus), Jam Kerja Sesi (editor jam per pola×hari×sesi + toggle aktif). Dashboard mini.
- Beranda greeting pakai nama user login (server→client split).
- **RLS hardening** `0004` ditulis (ADR-0010) — perlu user run.
- Build hijau; login+peran terverifikasi lewat API (browser pane tersembunyi jadi klik UI dilewati).

**Keputusan baru:** ADR-0009 (peran via admin_unit_kerja), ADR-0010 (akses konfigurasi via server + RLS deny).

**Blocker:** —. Catatan: user perlu jalankan `0004_rls_hardening.sql` sebelum go-live; ganti password admin setelah login pertama.

**Next (Fase 1):** modul Pegawai → Kiosk (device_secret, qr/generate, Realtime) → presensi/verify (klaim atomik) → data presensi nyata.

---

## Sesi #4 — 2026-08-10
**Tujuan:** Fase 1 — vertical slice presensi QR (kiosk → HP scan).

**Yang dikerjakan:**
- Modul **Pegawai** admin (CRUD + assign unit/pola, tambah unit kerja) — server actions service-role.
- Modul **Kiosk**: registrasi + `device_secret` (tampil sekali via useActionState), reset/aktif/hapus.
- Lib `sesi.ts`: waktu WITA (date-fns-tz), resolusi sesi terbuka per pola / instansi, upsert sesi_absensi_harian.
- Endpoint `POST /api/qr/generate` (auth device_secret, rotasi 60s + instan-saat-klaim) — **teruji live**.
- Endpoint `POST /api/presensi/verify` (verify HMAC → klaim atomik → resolusi sesi per-pegawai → simpan presensi + log).
- Halaman **kiosk/tampilan** (polling + render QR) & **absensi/scan** (html5-qrcode → verify → hasil).
- Integration test node: generate open=true, **klaim atomik 1-dari-2**, rotasi token setelah klaim. Semua lolos.
- Build hijau.

**Keputusan baru:** ADR-0011 (token=bukti kehadiran, sesi per-pegawai), ADR-0012 (kiosk polling, bukan Realtime).

**Blocker:** — (kamera hanya bisa diuji di HP fisik/HTTPS; logika inti sudah diverifikasi via API/DB).

**Next:** cron tutup sesi → data nyata beranda/riwayat → editor potongan → Fase 2 face verify → deploy Vercel.

---

## Sesi #5 — 2026-08-10
**Tujuan:** Perbaikan pasca-uji user + peningkatan keamanan kiosk.

**Yang dikerjakan:**
- Fix runtime error `/absensi`: halaman jadi Client Component (onClick getar tak boleh di Server Component).
- **Device binding kiosk** (ADR-0013): kolom `device_instance_id`+`terikat_at` (migrasi 0005). Generate mengunci perangkat pertama; perangkat lain ditolak (409). Reset secret melepas binding. Status "Terikat/Belum terikat" tampil di panel admin.
- Penjelasan ke user: device secret one-time per perangkat (localStorage); GPS kiosk tidak dipakai verifikasi (aman dipindah dalam kantor).
- Build hijau.

**Keputusan baru:** ADR-0013 (kiosk device binding).

**Blocker:** user perlu jalankan migrasi 0005 sebelum tes kiosk.

**Next:** cron tutup sesi harian → data nyata beranda/riwayat → editor potongan → Fase 2 (face) → deploy Vercel.

---

## Sesi #6 — 2026-08-10
**Tujuan:** Lanjut Fase 1 sesuai urutan: cron tutup sesi, data nyata beranda/riwayat, editor potongan.

**Yang dikerjakan:**
- Cron `/api/cron/tutup-sesi-harian` (+ `lib/tutup-sesi.ts`, `vercel.json` */5, `CRON_SECRET`): tandai `tidak_hadir` (masuk lewat batas) & `tidak_ada_di_kantor` (istirahat/pulang, hanya yang hadir pagi). Idempoten. Teruji: 401 tanpa auth, no-op saat window belum tutup, menandai tidak_hadir saat ditutup (dgn cleanup).
- Guard verify: sesi istirahat/pulang butuh masuk berhasil -> error `masuk_belum`.
- `lib/presensi-data.ts`: sesi hari ini + status live, rekap bulan.
- Beranda & Riwayat kini pakai data nyata (kalender warna-status + estimasi potongan via hitungPotongan).
- Editor aturan potongan admin (tambah/hapus per jenis).
- Build hijau di tiap tahap.

**Keputusan baru:** —

**Blocker:** — (saat deploy: set CRON_SECRET & semua env di Vercel).

**Next:** deploy Vercel -> Fase 2 face verify -> audit log UI.

---

## Sesi #7 — 2026-08-10
**Tujuan:** Fase 2 — face verification server-side.

**Yang dikerjakan:**
- Unduh model face-api (@vladmandic) ke public/models (tiny_face_detector, landmark68, recognition ~7MB).
- lib: face.ts (client descriptor via dynamic import), face-token.ts (HMAC 90s, namespace face:), face-embedding.ts (euclidean, threshold 0.55, pgvector literal helpers).
- POST /api/face/enroll (admin) + halaman /admin/enrollment (kamera -> descriptor -> upsert embedding). Nav admin +Enrollment.
- POST /api/face/verify (server hitung distance, keputusan di server) -> face_session_token.
- Langkah /absensi/wajah sebelum scan; /absensi/scan kirim face_session_token; presensi/verify gating WAJIB bila pegawai sudah enroll (belum enroll = dilewati, rollout bertahap).
- Teruji: pgvector roundtrip (self-distance 0, beda 3.39), auth 401/307, build hijau.

**Keputusan baru:** ADR-0014 (face: descriptor client, keputusan server, gating bertahap).

**Blocker:** kamera enroll/verify hanya bisa diuji di HP/HTTPS (deploy). Liveness belum ada.

**Next:** deploy Vercel -> uji kamera enroll+verify di HP -> liveness challenge -> audit log UI.

---

## Sesi #8 — 2026-08-10
**Tujuan:** Liveness challenge (Fase 2) + fix cron Vercel Hobby.

**Yang dikerjakan:**
- Fix deploy: vercel.json cron jadi harian `30 15 * * *` (23:30 WITA) — batas Hobby 1x/hari (ADR-0015).
- Liveness aktif di /absensi/wajah: challenge kedip 2x -> menoleh (EAR & yaw dari landmark face-api) sebelum capture descriptor. Timeout per langkah 12s, retry. lib/face.ts +getLandmarkMetrics.
- Build hijau. (Kamera liveness hanya bisa diuji di HP/HTTPS.)

**Keputusan baru:** ADR-0015 (cron harian).

**Blocker:** deploy Vercel oleh user; uji kamera end-to-end setelah live.

**Next:** setelah deploy & uji -> Audit Log admin -> Fase 3 (ekspor Sheets/Drive) -> notifikasi Web Push.

---

## Sesi #9 — 2026-08-10
**Tujuan:** Provisioning akun login pegawai (admin buat + password sementara) + penjelasan role.

**Yang dikerjakan:**
- Deploy Vercel sukses (commit f32e828) dikonfirmasi user.
- Klarifikasi model akun (admin-provisioned, no self-register — sesuai blueprint) & 3 role (super_admin/admin_unit/pegawai) + kiosk device. Ditulis ke ARCHITECTURE 4b.
- Server action buatAkunPegawai: auth.admin.createUser (email atau <nip>@qrensi.local) + link auth_user_id + password sementara tampil sekali. Pegawai page jadi client manager (status akun + kartu buat akun + banner kredensial).
- Teruji: create pegawai -> buat akun -> login OK -> peran kosong (pegawai biasa), lalu cleanup.
- Build hijau.

**Keputusan baru:** ADR-0016 (provisioning akun admin + utang teknis admin_unit scoping).

**Blocker:** —

**Next:** Audit Log admin -> Fase 3 (ekspor Sheets/Drive) -> Web Push -> perketat admin_unit scoping.

---

## Sesi #10 — 2026-08-10
**Tujuan:** Audit Log admin + Fase 3 ekspor Google Sheets.

**Yang dikerjakan:**
- Modul Audit Log (/admin/audit-log): baca presensi_verifikasi_log, filter hasil (sukses/gagal/dicurigai) & tipe (scan/face), 100 terbaru, tampil pegawai+waktu+alasan+jarak.
- lib/google-sheets.ts (JWT service account) + /admin/laporan (tombol ekspor useActionState) + action eksporSheets: hitung rekap bulanan semua pegawai (hadir/telat/menit/alpa/tdk-di-kantor/potongan%) -> tulis ke tab Rekap_MM-YYYY (overwrite).
- Nav admin +Laporan.
- Teruji: tulis nyata ke spreadsheet "Rekap QRensi" (auth+addSheet+update+deleteSheet), semua sukses.
- Build hijau.

**Keputusan baru:** —

**Blocker:** —

**Next:** backup Drive + ekspor terjadwal (cron ke-2) + PDF + form sanggahan; Web Push; perketat admin_unit scoping.

---

## Sesi #11 — 2026-08-10
**Tujuan:** Fase 3 — backup Google Drive (OAuth) untuk Drive personal.

**Yang dikerjakan:**
- Konfirmasi ke user: service account tak bisa upload ke Drive personal (kuota 0); Sheets jalan karena edit file existing. Pilihan: OAuth. (ADR-0017)
- lib/rekap.ts: computeRekapBulanan + rekapToCsv (dipakai bersama Sheets & Drive). Refactor eksporSheets memakainya.
- lib/google-drive.ts: OAuth2 (refresh token), scope drive.file, find/create folder "QRensi Backup", upload CSV.
- Action backupDrive + tombol "Backup CSV ke Drive" di /admin/laporan.
- scripts/get-google-refresh-token.mjs (loopback OAuth, cetak refresh token).
- .env.example + SETUP_CHECKLIST 4b (langkah OAuth + Production publish agar token tak 7-hari).
- Build hijau. (Drive belum bisa diuji sampai user isi GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN.)

**Keputusan baru:** ADR-0017 (Drive via OAuth).

**Blocker:** user perlu buat OAuth client + refresh token (panduan di SETUP 4b).

**Next:** setelah env OAuth -> uji backup Drive; ekspor/backup terjadwal (cron ke-2); form sanggahan; Web Push.

---

## Sesi #12 — 2026-08-10
**Tujuan:** Verifikasi Drive OAuth + ekspor/backup terjadwal + form sanggahan/izin.

**Yang dikerjakan:**
- Verifikasi backup Drive OAuth: upload CSV nyata OK (folder "QRensi Backup" dibuat).
- Cron /api/cron/laporan-harian (vercel.json 23:45 WITA): loop instansi -> Sheets export + Drive backup. Teruji live: sheets:ok, drive:ok.
- Fitur Izin & Sanggahan: migration 0006 (tabel sanggahan, RLS deny) + bucket Storage 'sanggahan' (privat 5MB, dibuat via service role). Pegawai /izin (form + riwayat, lampiran) via action ajukanIzin (upload service-role). Admin /admin/sanggahan (list, signed URL lampiran, approve/reject + catatan). Link di profil + nav admin.
- Build hijau.

**Keputusan baru:** —

**Blocker:** user jalankan migration 0006 sebelum tes sanggahan.

**Next:** Web Push (pengingat H-10 + notif anomali) [butuh migration push_subscription] -> PDF laporan -> perketat admin_unit scoping.

---

## Sesi #13 — 2026-08-10
**Tujuan:** Web Push real-time (tanpa reminder terjadwal) — notif anomali wajah ke admin.

**Yang dikerjakan:**
- install web-push. migration 0007 (push_subscription, RLS deny).
- lib/push.ts: pushToAuthUsers + adminAuthUserIds; VAPID dari env; auto-hapus langganan mati (410/404).
- public/sw.js: handler 'push' + 'notificationclick'; cache bump v2.
- /api/push/subscribe (simpan langganan user login). components/notif-toggle.tsx (minta izin + subscribe + POST). Dipasang di profil.
- face/verify: deteksi borderline (lolos tapi jarak > threshold-0.1) -> log 'dicurigai' + push anomali ke admin instansi (non-blocking).
- Build hijau; subscribe 401 tanpa auth. (Push penuh butuh deploy+HP+migration 0007.)

**Keputusan baru:** Web Push tanpa cron reminder (batas Hobby); reminder terjadwal butuh cron eksternal bila kelak diinginkan.

**Blocker:** user jalankan migration 0006 + 0007; uji push di HP setelah redeploy.

**Next:** PDF laporan bulanan -> hardening (rate-limit verify/generate + scoping admin_unit) -> (opsional) reminder via cron eksternal.

---

## Sesi #14 — 2026-08-10
**Tujuan:** Tuntaskan hingga siap: alur password (temuan user), PDF laporan, hardening. Satu commit.

**Yang dikerjakan:**
- Paksa ganti password login pertama: must_change_password (user_metadata) + guard redirect /ganti-password + halaman & form ganti-password. buatAkunPegawai set flag. (ADR-0018)
- Reset password pegawai oleh admin (resetPasswordPegawai) + kartu di /admin/pegawai (password sementara sekali tampil). Teruji lifecycle penuh via API.
- PDF: /laporan-cetak (print-to-PDF, kop+tabel+total+ttd) + link di /admin/laporan.
- Hardening: lib/rate-limit.ts; verify 10/mnt/IP; generate 40/mnt/secret. requireSuperAdmin tersedia.
- Build hijau.

**Keputusan baru:** ADR-0018 (paksa ganti password + reset admin).

**Blocker:** user jalankan migration 0006 + 0007 lalu redeploy. Scoping admin_unit = utang teknis (moot untuk pilot).

**Next (opsional):** rate-limit Upstash, scoping admin_unit, load test, reminder cron eksternal.

---

## Sesi #15 — 2026-08-22
**Tujuan:** Riset menyeluruh + audit + masterplan pembangunan ulang; mulai Tahap 1 (P0).

**Riset:** studi banding aplikasi absensi (Talenta/Gadjian/Hadirr/Jibble/Truein/Zimyo), pola UX admin list, panduan PWA resmi Next.js 16, PWA vs Capacitor vs TWA, penyebab getUserMedia tak prompt, RLS multi-tenant. Ditulis ke docs/RESEARCH.md dengan sumber.

**Audit (docs/AUDIT.md) — akar masalah TERBUKTI:**
- A1 logout: NextResponse.redirect default 307 -> POST dipertahankan -> POST /login = 405 (dibuktikan di produksi).
- A2 paksa ganti password tak ada di produksi: commit 54b9258 GAGAL push -> Vercel tak pernah build.
- A3 kamera: loadFaceModels() dipanggil SEBELUM getUserMedia() di kedua halaman -> bila model/WebGL gagal, izin kamera tak pernah diminta. PC berkamera seharusnya bisa.
- A4 modul pegawai: belum ada detail/edit/cari/filter (bukan kebocoran data; baru 1 instansi/2 unit/3 pegawai).
- +14 temuan tambahan (B1-B14).

**Dokumen baru:** AUDIT.md, RESEARCH.md, MASTERPLAN.md (Tahap 1-6 + DoD), QA_CHECKLIST.md; PROGRESS.md direstrukturisasi.

**Keputusan:** ADR-0019 (restrukturisasi terarah, bukan tulis ulang), ADR-0020 (kamera: izin sebelum model), ADR-0021 (Android via TWA, bukan Capacitor).

**Tahap 1 dikerjakan:** fix logout 303 (teruji: 303 -> /login 200), fix urutan kamera + fallback backend TF + pesan error ID, halaman /admin/akun (admin ganti password sendiri) + link ganti password di profil pegawai. Build hijau.

**Blocker:** push GitHub masih gagal ("Repository not found") -> semua perbaikan belum sampai produksi.

**Next:** selesaikan akses repo -> deploy -> user uji ulang -> Tahap 2 (rombak modul Pegawai).

---

## Sesi #16 — 2026-08-22 (lanjutan #15)
**Tujuan:** Buka blokir deploy + admin berjenjang + Tahap 2 modul Pegawai.

**Yang dikerjakan:**
- Blokir push teratasi (user perbarui kredensial). Blokir DEPLOY ketahuan: Vercel Hobby menolak commit ber-author `metrologiktb` (bukan pemilik project). Diperbaiki: satukan jadi satu commit ber-author `ngluyo` + force-push (ADR-0022).
- Riset admin berjenjang: standar SIMPEG daerah (Admin BKPSDM / UMPEG per OPD / Verifikator / Pegawai) + NIST Hierarchical RBAC -> docs/PERAN.md (matriks kewenangan lengkap + rencana implementasi).
- lib/izin.ts: can/assertCan/scopeUnits. Super Admin = semua; Admin OPD = unit yang diampu. Konfigurasi jam kerja/potongan, pindah unit, kelola peran, ekspor = khusus super admin. Enrollment wajah DIDELEGASIKAN ke Admin OPD (jawaban kebutuhan user).
- Modul Pegawai dirombak total: daftar (cari/filter/paginasi/badge), halaman detail [id] (profil editable, akun buat/reset, enrollment + hapus wajah, rekap bulan, hapus pegawai), semua action digating assertCan + scoping unit.
- Enrollment menerima `?pegawai=` untuk preselect. Hapus dead code pegawai-manager.
- Build hijau.

**Keputusan baru:** ADR-0022 (author commit = pemilik Vercel).

**Blocker:** —

**Next:** 2.6 manajemen admin (tunjuk/cabut peran) -> Tahap 3 (onboarding pegawai, riwayat interaktif) -> Tahap 4 (integritas data).
