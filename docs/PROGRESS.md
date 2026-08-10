# QRensi — Progress Tracker

> Direvisi tiap sesi (biasanya lewat `/qrensi-end`). Status: ☐ belum · ◐ jalan · ☑ selesai.
> **Terakhir diperbarui:** 2026-08-09

---

## Status Global
**Fase aktif:** Fase 1 — MVP QR (alur presensi inti jalan & teruji)
**Sesi terakhir:** #4 (2026-08-10)

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
- ☐ Job tutup sesi harian (set `tidak_hadir`/`tidak_ada_di_kantor`) — cron
- ☐ Beranda/riwayat pakai data presensi nyata (masih contoh)
- ☐ Editor aturan potongan (admin) + rekap potongan
- ☐ Face verification (Fase 2) disisipkan sebelum scan
## Fase 2 — Biometrik — ☐ belum mulai
## Fase 3 — Google & Laporan — ☐ belum mulai
## Fase 4 — Hardening — ☐ belum mulai

---

## Blocker / Menunggu User
- Kredensial Supabase (URL, anon, service_role) — lihat SETUP_CHECKLIST.
- Google Cloud service account (Sheets/Drive) — Fase 3, belum mendesak.
- SK resmi jam kerja ASN Kotabaru — pakai default seed dulu.

## Next Session (usulan) — lanjut Fase 1 → Fase 2
1. Cron **tutup sesi harian**: tandai `tidak_hadir` (masuk lewat batas) & `tidak_ada_di_kantor` (istirahat/pulang tak absen).
2. **Beranda & Riwayat** pakai data presensi nyata (query per pegawai, kalender bulan).
3. Editor **aturan potongan** + halaman rekap potongan pegawai.
4. **Fase 2:** face enrollment + `face/verify` server-side, sisipkan sebelum scan; audit log UI.
5. Deploy Vercel (env di dashboard) + uji di HP fisik (kamera butuh HTTPS).
