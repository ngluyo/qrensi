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
