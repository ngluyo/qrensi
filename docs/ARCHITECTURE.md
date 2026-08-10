# QRensi — Architecture

> **Status:** Living. Source of truth untuk *bagaimana* sistem dibangun.
> **Terakhir diperbarui:** 2026-08-09

---

## 1. Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | SSR/ISR, API routes, PWA |
| UI | Tailwind CSS + shadcn/ui + lucide-react + framer-motion | Native-Android feel (blueprint §8) |
| DB/Auth/Storage/Realtime | Supabase (Free) | Postgres 500MB, RLS, Realtime untuk rotasi QR |
| Hosting/CI | Vercel (Hobby) + GitHub | Auto-deploy dari `main` |
| Face | `@vladmandic/face-api` (client compute) + similarity **server-side** | Model di `public/models` |
| QR | `qrcode` (kiosk generate) + `html5-qrcode` (HP scan) | |
| Integrasi | `googleapis` (Sheets ekspor, Drive backup) | Lapisan sekunder, bukan DB utama |
| Push | Web Push API + VAPID | Gratis |
| Scheduler | Vercel Cron (+ opsi Supabase `pg_cron`) | Rotasi fallback, tutup sesi, ekspor, backup |

**Prinsip zero-budget:** komputasi berat (face descriptor) di client; server hanya memutuskan. Foto di Supabase Storage (bukan DB). Retensi log 90 hari → arsip Drive.

## 2. Data Model (ringkas — DDL lengkap di `supabase/migrations/0001_init_schema.sql`)

```
instansi ─< unit_kerja ─< pegawai
instansi ─< pola_hari_kerja ─< jam_kerja_sesi ─< sesi_absensi_harian
instansi ─< unit_kerja ─< perangkat_kiosk ─< qr_token
sesi_absensi_harian ─< presensi ─< presensi_verifikasi_log
pegawai ─< pegawai_face_enrollment
instansi ─< pengaturan_potongan
```

**Keputusan penting:**
- Multi-tenant (`instansi`) sejak awal → bisa dipakai kabupaten/instansi lain.
- QR token milik **kiosk**, bukan pegawai (v2). Uniqueness dari nonce 128-bit → tak perlu koordinasi antar-kiosk, tak perlu "pool QR".
- Device binding di **kiosk** (`device_secret_hash`), bukan HP pegawai.
- `face_embedding vector(128)` via pgvector (fallback `float8[]` jika ekstensi tak ada).

## 3. Alur Teknis Kritis

### 3.1 Klaim token atomik (anti race-condition)
```sql
UPDATE qr_token
SET status='diklaim', diklaim_oleh_pegawai_id=$pegawai, diklaim_at=now()
WHERE token_value=$token AND status='aktif' AND expires_at>now()
RETURNING id;
```
0 baris → "kode sudah dipakai/kedaluwarsa". Klaim berhasil → publish Realtime ke channel kiosk → rotasi instan. Fallback timer 1 menit jika tak ada yang scan.

### 3.2 Face verify server-side
HP kirim **descriptor** (bukan boolean). Server hitung similarity vs embedding akun login → terbitkan `face_session_token` (HMAC-signed, ±90s). Client tak pernah dipercaya untuk memutuskan lolos.

### 3.3 Generate token kiosk
```
payload = { device_id, sesi_id, nonce=random(16B), issued_at }
token_value = base64url(payload) + "." + HMAC_SHA256(QR_SIGNING_SECRET, payload)
expires_at = issued_at + 2 menit
```

## 4. Struktur Folder (target)

```
src/
  app/
    (pegawai)/  beranda | absensi | absensi/scan | riwayat | profil
    (kiosk)/    tampilan
    (admin)/    pegawai | jam-kerja | pola-hari-kerja | kiosk | potongan | audit-log
    api/
      presensi/verify | face/verify | qr/generate
      cron/ generate-qr-tokens | tutup-sesi-harian | ekspor-sheets | backup-drive
  components/ ui | qr-display | qr-scanner | face-capture | bottom-nav
  lib/
    supabase/ client | server | middleware
    qr-token | jam-kerja | potongan | face-recognition | kiosk-auth
    google-sheets | google-drive
  types/ database.types.ts   # supabase gen types
supabase/migrations/
public/ models | icons | manifest.json
```

## 4b. Peran & Akses

- **Super Admin** (`admin_unit_kerja.peran='super_admin'`): akses penuh semua instansi/unit, konfigurasi, pegawai, kiosk, enrollment, audit, ekspor.
- **Admin Unit** (`admin_unit_kerja.peran='admin_unit'`): panel admin (kelola pegawai/jam/kiosk/potongan/enrollment). *Utang teknis:* saat ini belum dibatasi ke unitnya (setara super_admin; action per-instansi).
- **Pegawai** (baris `pegawai` bertaut `auth_user_id`, tanpa baris admin): hanya data sendiri (beranda/absensi/riwayat/profil), dijaga RLS.
- **Kiosk**: bukan akun — perangkat ber-`device_secret` + binding; hanya minta token QR.

**Provisioning:** admin buat data pegawai → "Buat akun login" (`auth.admin.createUser`, email atau `<nip>@qrensi.local`) → password sementara tampil sekali. Tidak ada self-registration (blueprint).

## 5. Keamanan

- **RLS:** pegawai hanya lihat datanya; `qr_token` default-deny (hanya server service_role). Admin unit lihat pegawai unitnya.
- **Rate limit:** `/api/presensi/verify` & `/api/qr/generate` (10/menit/IP, cooldown gagal beruntun).
- **Audit:** semua percobaan (sukses/gagal) ke `presensi_verifikasi_log`. Retensi ≥1 tahun (arsip Drive).
- **Secrets:** `service_role`, `QR_SIGNING_SECRET`, Google key, VAPID — hanya server, tak pernah ke client.

## 6. Batas Free Tier yang Dipantau

Supabase DB 500MB / egress 5GB / realtime 200 koneksi; Vercel 100GB bandwidth; Google Sheets 300 read + ~60 write/menit (ekspor batch, bukan real-time). Mitigasi: kompres foto ≤200KB WebP, polling fallback 5–10s, purge `qr_token` harian, ekspor terjadwal.
