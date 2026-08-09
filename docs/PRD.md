# QRensi — Product Requirements Document (PRD)

> **Status:** Living document. Source of truth untuk *apa* & *kenapa*.
> **Turunan dari:** `blueprint-presensi-asn-kotabaru.md` (v2.0). Jika PRD dan blueprint bertentangan, PRD yang berlaku (blueprint = riset & rasional; PRD = keputusan implementasi terkini).
> **Terakhir diperbarui:** 2026-08-09

---

## 1. Ringkasan Produk

**QRensi** = sistem presensi ASN berbasis **QR dinamis + face recognition server-side + bukti lokasi via kedekatan fisik ke kiosk**, untuk Pemerintah Kabupaten Kotabaru. Zero-budget (100% free tier), PWA-first.

**Analogi inti:** mirip Google Authenticator (kode berputar berbasis waktu & secret), tapi berbentuk QR yang **ditampilkan di kiosk kantor** dan **dipindai HP pegawai**.

**Nilai utama:** presensi yang sulit dititipkan, menghitung keterlambatan & potongan tunjangan otomatis, dan meninggalkan jejak audit kuat untuk keputusan kepegawaian — tanpa biaya lisensi.

## 2. Pengguna & Peran

| Peran | Kebutuhan utama |
|---|---|
| **Pegawai** | Absen 3 sesi/hari dari HP apa pun (login → verifikasi wajah → scan QR kiosk), lihat riwayat & rekap potongan, ajukan sanggahan |
| **Kiosk** | Perangkat tetap kantor menampilkan QR berputar + feed log real-time. Auth via `device_secret`, bukan akun pegawai |
| **Admin Unit** | CRUD pegawai, set pola hari & jam kerja unit, kelola kiosk unit, dashboard rekap, approve sanggahan |
| **Super Admin (BKPSDM/Diskominfo)** | Multi-instansi, aturan potongan, audit log, ekspor Sheets, backup Drive, integrasi Google API |

## 3. Alur Utama (v2 — WAJIB dipatuhi)

1. Pegawai buka PWA di HP apa pun → login (Supabase Auth).
2. Sesi absensi terbuka → tekan "Mulai Absensi" → kamera → capture wajah → hitung descriptor (client) → kirim descriptor ke server.
3. **Server** hitung cosine similarity vs `face_embedding` akun → jika lolos, terbitkan `face_session_token` (signed, ±90 detik). *Keputusan lolos SELALU di server.*
4. Menu scan QR terbuka (hanya jika `face_session_token` valid) → HP scan QR kiosk.
5. `POST /api/presensi/verify` `{token_value, face_session_token}` → **klaim atomik** token (UPDATE ... WHERE status='aktif' RETURNING) → jika menang, simpan `presensi` → kiosk rotasi QR seketika (Realtime).

## 4. Aturan Bisnis Kunci

- **Jam kerja = data, bukan hardcode.** Semua di tabel `jam_kerja_sesi` / `pola_hari_kerja`, editable via UI admin. Perubahan **tidak retroaktif**.
- **Default seed (menunggu SK resmi Kotabaru — lihat SETUP_CHECKLIST):**
  - Senin–Kamis: masuk 07:15–07:45 (batas akhir 10:00) | istirahat 12:30–13:30 | pulang 16:30–17:30
  - Jumat: masuk 07:15–07:45 (batas akhir 10:00) | tanpa istirahat | pulang 11:00–12:00
  - Sabtu (pola Senin–Sabtu): masuk 07:15–07:45 | istirahat 12:30–13:30 | pulang 12:00–13:00
- **State machine status presensi:** `tepat_waktu`, `terlambat`, `pulang_cepat`, `tidak_hadir`, `tidak_ada_di_kantor`, `ditolak_lokasi`, `ditolak_wajah`, `ditolak_di_luar_jendela`.
  - Lewat `jam_batas_akhir` sesi masuk → `tidak_hadir` + sesi istirahat/pulang hari itu terkunci.
  - Tidak absen istirahat/pulang padahal masuk berhasil → `tidak_ada_di_kantor` (sinyal pola, bukan hukuman per-kejadian).
- **Potongan:** sistem hanya keluarkan **persentase & rekap menit**, bukan rupiah. Nominal dikalikan tim keuangan.

## 5. Batasan Jujur (dari blueprint §1, §6)

- Tidak ada sistem presensi yang 100% anti-curang. Tujuan = **defense-in-depth** + audit trail, bukan kesempurnaan.
- Liveness gratis < vendor bersertifikat; risiko kolusi penuh (pemilik akun serahkan HP ke wajah lain) tetap ada → ranah kebijakan & sanksi.
- Fake-GPS tak relevan di alur utama karena lokasi dibuktikan lewat scan kiosk fisik. Native/TWA hanya perlu jika kelak ada mode presensi jarak jauh (WFA).

## 6. Non-Goals (untuk saat ini)

- Menghitung nominal rupiah TPP.
- Mode presensi jarak jauh / WFA berbasis GPS self-report.
- Native app (Capacitor/TWA) untuk alur utama — PWA cukup.
- Sertifikasi liveness iBeta/NIST.

## 7. Acceptance Criteria per Fase (ringkas — detail di PROGRESS.md)

- **Fase 0 — Fondasi:** repo + Next.js PWA scaffold, skema DB lengkap ter-migrate, auth dasar, modul setting jam kerja & pola hari kerja jalan (CRUD).
- **Fase 1 — MVP QR:** rotasi QR kiosk + klaim atomik, state machine jam kerja, HP scan → presensi tersimpan, hitung telat & potongan, dashboard admin dasar.
- **Fase 2 — Biometrik:** face enrollment + verify server-side, liveness challenge dasar, device binding kiosk, audit log lengkap, notif anomali.
- **Fase 3 — Google & Laporan:** ekspor Sheets, backup Drive, laporan bulanan PDF, form sanggahan.
- **Fase 4 — Hardening:** rate limiting, load test jam sibuk, audit keamanan, evaluasi TWA (jika WFA ditambah), sosialisasi.

## 8. Kepatuhan (UU PDP No. 27/2022)

Data wajah = biometrik. Wajib: consent tertulis saat enrollment, akses `face_embedding` hanya server (service_role), mekanisme right-to-erasure, Storage bucket privat, jalur sanggahan manusia (bukan keputusan algoritma murni). Lihat blueprint §13.
