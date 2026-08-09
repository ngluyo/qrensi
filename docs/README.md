# QRensi — Docs Index (Sistem Memori Proyek)

Proyek ini dikerjakan bertahap lintas sesi. Agar konteks tidak hilang, semua "jalan pikiran & memori" proyek disimpan di sini.

| File | Isi | Kapan dibaca/ditulis |
|---|---|---|
| `PRD.md` | Apa & kenapa (scope, user, fitur, aturan) | Baca saat mulai; revisi jika scope berubah |
| `ARCHITECTURE.md` | Bagaimana (stack, data model, alur teknis) | Baca saat mulai; revisi jika desain berubah |
| `DECISIONS.md` | Log keputusan (ADR, append-only) | Tambah tiap keputusan penting |
| `PROGRESS.md` | Status per fase & checklist | Revisi tiap sesi |
| `SESSION_LOG.md` | Jurnal per sesi | Tambah tiap tutup sesi |
| `SETUP_CHECKLIST.md` | Tugas user (akun, kredensial) | Update saat ada yang beres |

## Ritual Sesi
- **Mulai:** ketik `/qrensi-start` → Claude muat konteks dari file di atas & usulkan target.
- **Tutup:** ketik `/qrensi-end` → Claude sinkronkan docs, catat ADR & jurnal, siapkan commit.

Sumber riset asli: `../blueprint-presensi-asn-kotabaru.md` (v2.0). PRD/ARCHITECTURE adalah turunan keputusan; jika bertentangan, dokumen di `/docs` yang berlaku.
