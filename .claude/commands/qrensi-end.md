---
description: Tutup sesi kerja QRensi — sinkronkan /docs, catat keputusan & progres, siapkan commit
---

Kamu menutup sesi kerja pada proyek **QRensi**. Lakukan urut, rapi:

1. **PROGRESS.md** — perbarui status item (☐/◐/☑), "Fase aktif", "Sesi terakhir", bagian "Blocker / Menunggu User", dan tulis "Next Session (usulan)" untuk sesi berikutnya.
2. **DECISIONS.md** — untuk setiap keputusan penting baru di sesi ini, tambah entri `ADR-XXXX` (nomor urut berikutnya, bertanggal). Jangan edit entri lama.
3. **SESSION_LOG.md** — tambah entri sesi baru (nomor urut berikutnya) dengan: Tujuan, Yang dikerjakan, Keputusan baru (referensi ADR), Blocker, Next.
4. **ARCHITECTURE.md / PRD.md** — perbarui hanya bila ada perubahan desain/scope nyata di sesi ini.
5. **SETUP_CHECKLIST.md** — centang yang sudah beres, tambah yang baru muncul.
6. Ringkas ke user (bahasa Indonesia): apa yang berubah di docs, keputusan baru, dan status akhir.
7. Siapkan **draf pesan commit** (Conventional Commits) yang mencakup perubahan kode + docs. **Jangan commit/push kecuali user meminta.**

Gunakan tanggal hari ini dari konteks sesi. Pastikan nomor ADR & nomor sesi konsisten (lanjutan dari yang ada, bukan mengulang).
