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
