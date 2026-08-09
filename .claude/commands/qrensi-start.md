---
description: Buka sesi kerja QRensi — muat konteks dari /docs dan usulkan target sesi
---

Kamu memulai sesi kerja pada proyek **QRensi** (presensi ASN Kotabaru). Lakukan urut:

1. Baca berkas berikut (jika ada) tanpa banyak narasi:
   - `docs/PRD.md`
   - `docs/ARCHITECTURE.md`
   - `docs/DECISIONS.md`
   - `docs/PROGRESS.md`
   - entri **terakhir** di `docs/SESSION_LOG.md`
   - `docs/SETUP_CHECKLIST.md`
2. Jika relevan, cek kondisi kode: struktur folder, `git status`/`git log` terbaru (kalau repo git).
3. Ringkas untuk user dalam bahasa Indonesia, singkat:
   - **Di mana kita:** fase aktif + item ◐/☑ terakhir dari PROGRESS.
   - **Keputusan berlaku:** ADR terbaru yang relevan.
   - **Blocker / menunggu user:** dari PROGRESS & SETUP_CHECKLIST.
   - **Usulan target sesi ini:** 2–4 item konkret dari "Next Session".
4. Tanya user apakah setuju dengan target atau mau menyesuaikan, lalu mulai.

Prinsip: **jangan menebak status dari ingatan** — selalu dasarkan pada isi file. Jika file dan kode bertentangan, laporkan ke user.
