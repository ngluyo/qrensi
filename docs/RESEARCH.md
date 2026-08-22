# QRensi — Riset & Studi Banding (2026-08-22)

> Basis keputusan desain. Sumber di bagian akhir. Dipakai oleh `MASTERPLAN.md`.

---

## 1. Studi banding aplikasi absensi (Indonesia & global)

Aplikasi yang ditelaah: **Mekari Talenta, Gadjian, Hadirr, Jibble, Kantor Kita, LinovHR, Truein, Zimyo, DeskTrack** — plus praktik MASOOK (pembanding lokal ASN dari blueprint).

### Fitur yang hampir SELALU ada (baseline wajib)
| Fitur | Ada di QRensi? | Catatan |
|---|---|---|
| Clock-in/out cepat dari HP | ✅ | via QR kiosk |
| Verifikasi selfie / biometrik | ✅ | face verify server-side |
| GPS + geofencing | ⛔ (disengaja) | diganti bukti kedekatan fisik ke kiosk |
| Jadwal & shift fleksibel | ✅ | pola hari + jam sesi |
| **Pengajuan cuti/izin digital** | ✅ | modul sanggahan |
| **Approval berjenjang** | ◐ | approve ada, berjenjang belum |
| Rekap & laporan ekspor | ✅ | Sheets + CSV + PDF |
| Integrasi payroll | ◐ | keluarkan % potongan, bukan rupiah (disengaja) |
| **Self-service profil pegawai** | ⛔ | **belum ada** → temuan audit B4 |
| **Notifikasi/pengingat** | ◐ | push ada; reminder terjadwal belum |
| **Dashboard analitik HR** | ⛔ | belum ada tren/insight |
| Deteksi anomali / buddy punching | ◐ | face + liveness + audit log |

**Pelajaran utama:** yang membedakan aplikasi matang bukan fitur absennya (semua mirip), tapi **kelengkapan siklus hidup pegawai** (profil → akun → enrollment → absen → izin → rekap → laporan) dan **self-service**. QRensi kuat di mekanisme absen, lemah di siklus hidup & self-service.

### Pelajaran UX dari riset
- **Login harus tanpa hambatan**; pekerja dengan literasi teknis rendah harus bisa pakai.
- **Onboarding berbasis peran** + microcopy + indikator progres.
- **Micro-interactions** (feedback tombol, transisi) meningkatkan kejelasan status.
- Untuk 2025–2026: tren **deteksi pola & anomali otomatis** (flag ke HR), bukan blokir keras.

## 2. Pola UX admin (daftar pegawai)

Praktik standar yang **belum** kita punya:
- Tabel/list dengan **pencarian** (nama+NIP), **filter** (unit, status, punya akun), **sort**, **paginasi** (10/25/50).
- **Badge status berwarna** + avatar.
- **Detail via drawer/halaman** ("View details") — bukan list mati.
- **Bulk action** (opsional) untuk operasi massal.
- **Mobile:** filter sebagai **bottom sheet** dengan badge jumlah filter aktif.

## 3. PWA rasa-native & opsi Android

### Panduan resmi Next.js (v16)
- `app/manifest.ts` (atau `manifest.json`) untuk installability.
- Web Push didukung **Chromium, Firefox, Safari 16+/iOS 16.4+** (iOS: **harus di-install ke home screen** dulu).
- **Header keamanan** disarankan: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, plus `Cache-Control: no-cache` khusus `/sw.js`.
- Offline lanjutan: **Serwist** (penerus next-pwa) bila perlu.
- Uji lokal push/kamera: `next dev --experimental-https`.

### PWA vs Capacitor vs TWA — keputusan untuk QRensi
| Opsi | Cocok? | Alasan |
|---|---|---|
| **PWA (sekarang)** | ✅ inti | Install ke home screen, fullscreen, kamera, push. Update instan tanpa app store. |
| **Capacitor** | ⛔ | Membutuhkan **static export** untuk aset web. QRensi memakai **Server Actions + API routes + SSR** → static export akan mematahkan arsitektur. Riset juga mencatat dukungan static export makin bermasalah untuk Next.js modern. |
| **TWA (Bubblewrap)** | ✅ **pilihan Android** | Membungkus **URL PWA yang sudah live** jadi APK/AAB. **Tidak perlu ubah kode**, cukup `assetlinks.json`. Bisa disebar via link atau Play Store internal. |

**Kesimpulan:** tetap **PWA-first**, dan bila ingin "aplikasi Android", gunakan **TWA/Bubblewrap** — bukan Capacitor.

## 4. Kamera di browser (akar bug A3)

- `getUserMedia` **wajib secure context** (HTTPS / localhost). Produksi kita HTTPS ✔.
- Prompt izin **hanya muncul saat `getUserMedia()` benar-benar dipanggil** → jika kode gagal sebelum itu, user tak melihat apa-apa (**persis bug kita**).
- Chrome **mengingat penolakan**; setelah ditolak sekali tak akan bertanya lagi sampai direset user.
- face-api/TF.js: bila **WebGL tak tersedia/gagal**, muncul error backend dan pemuatan model gagal → wajib `tf.setBackend()`/`tf.ready()` eksplisit atau **fallback WASM**.

**Implikasi desain:** minta kamera **lebih dulu**, muat model setelahnya, tampilkan error asli, sediakan panduan reset izin.

## 5. Multi-tenant & RLS (Supabase/Postgres)

- Pola **pooled** (satu tabel + `tenant_id`) adalah standar SaaS — sudah dipakai QRensi (`instansi_id`).
- **RLS = perlindungan dasar; logika aplikasi = aturan bisnis.** Butuh keduanya.
- Overhead RLS **kecil** (≈3.6ms vs 3.2ms pada 100k baris/1000 tenant) → bukan alasan menghindarinya.
- **Wajib:** setiap tabel dalam join punya policy sendiri; pasangkan policy UPDATE dengan SELECT.
- Keanggotaan/peran disimpan di tabel relasi (kita: `admin_unit_kerja`) — sesuai praktik.

**Implikasi:** arsitektur tenancy kita **sudah benar**; yang kurang adalah **penegakan peran per-unit** di lapisan aplikasi (temuan B1).

---

## Sumber

- [Next.js — Guides: PWAs](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [MDN — MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN — 303 See Other](https://developer.mozilla.org/docs/Web/HTTP/Status/303)
- [Next.js — Guides: Redirecting](https://nextjs.org/docs/app/building-your-application/routing/redirecting)
- [vladmandic/face-api — WebGL not supported (Discussion #192)](https://github.com/vladmandic/face-api/discussions/192)
- [vladmandic/face-api — FaceAPI with WASM in Next.js (Issue #65)](https://github.com/vladmandic/face-api/issues/65)
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase RLS Patterns for Multi-Tenant SaaS (MetaDesign)](https://metadesignsolutions.com/blog/supabase-rls-patterns-production-guide-multi-tenant-saas)
- [Mekari Talenta — Absensi Online](https://mekari.com/produk/talenta/absensi-online/)
- [Jibble — Aplikasi Absensi Indonesia](https://www.jibble.io/id/aplikasi-absensi-indonesia)
- [Kantor Kita — Review aplikasi absensi digital](https://www.kantorkita.co.id/blog/review-5-aplikasi-absensi-digital-terpopuler-di-indonesia/)
- [Truein — Attendance apps 2026](https://truein.com/blogs/attendance-app-for-employees)
- [Zimyo — Mobile attendance apps 2025](https://www.zimyo.com/resources/insights/best-mobile-apps-for-employee-attendance-tracking/)
- [Orbix — Mobile App UI/UX Best Practices](https://www.orbix.studio/blogs/mobile-app-ux-best-practices-guide)
- [Pencil&Paper — Mobile Filter UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-mobile-filters)
- [UXPin — Filter UI/UX best practices](https://www.uxpin.com/studio/blog/filter-ui-and-ux/)
- [JS Conference — PWA, TWA, Capacitor, Electron: which to choose](https://javascript-conference.com/progressive-web-apps/pwa-twa-capacitor-electron-which-one-should-i-choose/)
