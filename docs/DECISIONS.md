# QRensi — Decision Log (ADR ringkas)

> Append-only. Setiap keputusan penting = 1 entri. Format: tanggal, konteks, keputusan, alasan.
> Jangan edit entri lama; jika berubah, tambah entri baru yang mereferensikan yang lama (`menggantikan ADR-XXX`).

---

### ADR-0001 — Brand & nama proyek: "QRensi"
- **Tanggal:** 2026-08-09
- **Keputusan:** Nama aplikasi & package = `QRensi` (dari nama folder). Tagline: "Presensi ASN Kotabaru".
- **Alasan:** Brand pendek & khas; blueprint dipakai sebagai dokumen riset, bukan nama produk.

### ADR-0002 — Scaffold di root folder `QRensi/`
- **Tanggal:** 2026-08-09
- **Keputusan:** Proyek Next.js di root folder ini, berdampingan dengan `blueprint-*.md` dan `docs/`.
- **Alasan:** Paling simpel untuk git & Vercel; belum butuh monorepo.

### ADR-0003 — Sistem memori lintas-sesi berbasis `/docs` + slash command
- **Tanggal:** 2026-08-09
- **Keputusan:** Dokumen hidup (`PRD`, `ARCHITECTURE`, `DECISIONS`, `PROGRESS`, `SESSION_LOG`, `SETUP_CHECKLIST`) di `/docs`, dikelola lewat perintah `/qrensi-start` & `/qrensi-end` (`.claude/commands/`).
- **Alasan:** Proyek panjang & bertahap lintas sesi; konteks harus bisa direkonstruksi dari file, bukan ingatan chat.

### ADR-0004 — Ikuti arah alur v2 blueprint (kiosk tampil QR, HP scan)
- **Tanggal:** 2026-08-09
- **Keputusan:** Adopsi penuh desain v2: QR di kiosk, HP pegawai memindai; face verify server-side; device binding di kiosk; tanpa GPS self-report HP.
- **Alasan:** Bukti lokasi lebih kuat (kedekatan fisik), menghapus masalah device binding HP & fake-GPS untuk alur utama. PWA cukup.

### ADR-0008 — PWA di-handle manual (service worker sendiri)
- **Tanggal:** 2026-08-10
- **Keputusan:** Karena `next-pwa` ditunda (ADR-0006), buat `public/sw.js` sendiri (network-first navigasi, cache-first aset) + registrasi produksi-saja via `sw-register.tsx`. Ikon PWA digenerate dengan `sharp` dari glyph QRensi.
- **Alasan:** Installable + offline app-shell tanpa dependency yang belum stabil; dev tidak ter-cache.

### ADR-0007 — Design system "Laut" (identitas maritim Kotabaru)
- **Tanggal:** 2026-08-10
- **Keputusan:** Tipografi **Plus Jakarta Sans** (typeface Indonesia). Palette OKLCH light/dark: brand ocean-blue + accent teal, semantik success/warning/info/danger. Radius besar, elevasi lembut (bukan border), motion easing spring `cubic-bezier(0.32,0.72,0,1)`, haptic pada aksi. Detail di `docs/DESIGN.md`.
- **Alasan:** Target "native, modern, bukan AI slop" + resonansi lokal (Pulau Laut) + aksesibilitas untuk ASN lintas usia.

### ADR-0006 — Next.js 16 + tunda `next-pwa`
- **Tanggal:** 2026-08-09
- **Keputusan:** Pakai Next.js 16 (hasil `create-next-app` terbaru) + Tailwind v4. Konvensi middleware pakai `src/proxy.ts`. **Tunda** plugin `next-pwa`; PWA cukup via `manifest.json` + metadata dulu, service worker menyusul.
- **Alasan:** `next-pwa` belum stabil di Next 16; menghindari blocker build. Blueprint menyebut Next 15, tapi 16 kompatibel untuk kebutuhan kita.

### ADR-0005 — Jam kerja & aturan sebagai data, bukan hardcode
- **Tanggal:** 2026-08-09
- **Keputusan:** Seluruh jam/pola/mode jendela disimpan di tabel & diedit via UI admin; perubahan tidak retroaktif.
- **Alasan:** Regulasi jam kerja Kotabaru belum final (SK resmi belum diperoleh) dan sudah berubah beberapa kali; harus fleksibel tanpa ubah kode.
