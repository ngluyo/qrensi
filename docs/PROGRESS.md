# QRensi — Progress Tracker

> Direvisi tiap sesi (biasanya lewat `/qrensi-end`). Status: ☐ belum · ◐ jalan · ☑ selesai.
> **Terakhir diperbarui:** 2026-08-09

---

## Status Global
**Fase aktif:** Fase 0 — Fondasi **SELESAI** → mulai Fase 1
**Sesi terakhir:** #3 (2026-08-10)

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

## Fase 1 — MVP QR — ◐ mulai
- ☐ Modul Pegawai (CRUD + assign pola) — admin
- ☐ Registrasi Kiosk + generate/reset device_secret
- ☐ Endpoint `qr/generate` (kiosk) + halaman kiosk tampil QR nyata (Realtime)
- ☐ Endpoint `presensi/verify` (klaim atomik) + scan di HP
- ☐ Job buka/tutup sesi harian + state machine ke DB
- ☐ Hitung telat & potongan + rekap; beranda/riwayat data nyata
- ☐ Editor aturan potongan (admin)
## Fase 2 — Biometrik — ☐ belum mulai
## Fase 3 — Google & Laporan — ☐ belum mulai
## Fase 4 — Hardening — ☐ belum mulai

---

## Blocker / Menunggu User
- Kredensial Supabase (URL, anon, service_role) — lihat SETUP_CHECKLIST.
- Google Cloud service account (Sheets/Drive) — Fase 3, belum mendesak.
- SK resmi jam kerja ASN Kotabaru — pakai default seed dulu.

## Next Session (usulan) — Fase 1
0. **(User)** Jalankan `supabase/migrations/0004_rls_hardening.sql` (hardening).
1. Modul **Pegawai** admin (CRUD + assign pola) → agar bisa daftar pegawai nyata.
2. **Kiosk**: registrasi + `device_secret`, endpoint `qr/generate`, halaman kiosk QR nyata + Realtime rotasi.
3. **Presensi**: endpoint `presensi/verify` (klaim atomik) + scan HP + state machine → simpan presensi.
4. Beranda/riwayat pakai data presensi nyata + hitung potongan.
