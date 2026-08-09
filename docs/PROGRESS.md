# QRensi — Progress Tracker

> Direvisi tiap sesi (biasanya lewat `/qrensi-end`). Status: ☐ belum · ◐ jalan · ☑ selesai.
> **Terakhir diperbarui:** 2026-08-09

---

## Status Global
**Fase aktif:** Fase 0 — Fondasi (≈90%)
**Sesi terakhir:** #2 (2026-08-10)

> ✅ Schema DB **sudah di-apply** (2 pola, 31 baris jam_kerja_sesi, 5 aturan potongan) — 2026-08-10.
> Siap untuk gen types + wiring auth & CRUD.

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
- ◐ Modul setting Pola Hari Kerja (CRUD) — UI placeholder; **wiring nunggu schema DB**
- ◐ Modul setting Jam Kerja Sesi (CRUD) — UI placeholder; **wiring nunggu schema DB**
- ☐ Auth dasar (login) — **nunggu schema DB** (Supabase Auth siap, tabel pegawai belum)
- ☐ Deploy pertama ke Vercel (butuh kredensial user)

**Catatan teknis Fase 0:**
- Next.js **16** (bukan 15); konvensi `middleware`→`proxy.ts`.
- Tailwind **v4**. `next-pwa` DITUNDA (belum stabil di Next 16) → PWA di-handle manual: `manifest.json` + metadata + `public/sw.js` (produksi saja).
- pgvector dipakai untuk `face_embedding vector(128)` (fallback `float8[]`).
- Git remote: `https://github.com/ngluyo/qrensi.git` (privat, masih kosong — belum push).

## Fase 1 — MVP QR — ☐ belum mulai
## Fase 2 — Biometrik — ☐ belum mulai
## Fase 3 — Google & Laporan — ☐ belum mulai
## Fase 4 — Hardening — ☐ belum mulai

---

## Blocker / Menunggu User
- Kredensial Supabase (URL, anon, service_role) — lihat SETUP_CHECKLIST.
- Google Cloud service account (Sheets/Drive) — Fase 3, belum mendesak.
- SK resmi jam kerja ASN Kotabaru — pakai default seed dulu.

## Next Session (usulan)
0. **(User)** Jalankan `supabase/APPLY_ALL.sql` di SQL Editor → buka blocker.
1. `supabase gen types typescript` → `src/types/database.types.ts`.
2. Auth: halaman login + proteksi route (pegawai/admin) + seed 1 user admin.
3. Admin CRUD **Pola Hari Kerja** & **Jam Kerja Sesi** (server actions) — hidupkan data.
4. Beranda: ganti data contoh dengan query sesi/presensi nyata.
