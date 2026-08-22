# QRensi — QA Checklist

> Dipakai setiap akhir tahap `MASTERPLAN.md` dan sebelum rilis. Tandai ☑ bila lulus, catat temuan ke `AUDIT.md`.
> Uji di **HP (Android Chrome)** dan **desktop** — beberapa alur (kamera, push, install) hanya valid di HTTPS produksi.

---

## A. Autentikasi & Akun
- ☐ Login admin berhasil
- ☐ Login pegawai berhasil
- ☐ Login salah → pesan jelas (bukan error mentah)
- ☐ **Logout → mendarat di `/login` (bukan error/405)**
- ☐ **Login pertama pegawai → dipaksa ganti password**
- ☐ Setelah ganti password → bisa login dengan password baru
- ☐ **Admin bisa ganti password sendiri dari dalam app**
- ☐ Admin reset password pegawai → pegawai wajib ganti lagi
- ☐ Akses `/admin` tanpa login → diarahkan ke login
- ☐ Pegawai biasa buka `/admin` → ditolak

## B. Modul Pegawai (admin)
- ☐ Daftar pegawai tampil
- ☐ **Pencarian** nama/NIP bekerja
- ☐ **Filter** unit & status bekerja
- ☐ Paginasi bekerja (bila data banyak)
- ☐ **Klik pegawai → halaman detail terbuka**
- ☐ **Edit profil pegawai tersimpan**
- ☐ Buat akun → kredensial tampil sekali
- ☐ Reset password dari detail
- ☐ Nonaktifkan/aktifkan pegawai
- ☐ Admin unit hanya melihat pegawai unitnya

## C. Enrollment & Verifikasi Wajah
- ☐ **Prompt izin kamera muncul** (PC & HP)
- ☐ Kamera tampil; wajah terdeteksi
- ☐ Enrollment tersimpan (status "Terdaftar")
- ☐ Verifikasi wajah pegawai yang benar → lolos
- ☐ Verifikasi wajah orang lain → ditolak
- ☐ **Liveness**: kedip & menoleh terdeteksi
- ☐ Foto statis (spoof) → gagal liveness
- ☐ Izin kamera ditolak → pesan + panduan reset

## D. Alur Absensi (inti)
- ☐ Kiosk: setup device secret sekali → QR tampil
- ☐ Kiosk: QR berotasi (≤60 dtk / instan setelah dipakai)
- ☐ Kiosk: secret di perangkat lain → ditolak
- ☐ Kiosk di luar jam sesi → "Belum ada sesi"
- ☐ Pegawai: absen masuk tepat waktu → status `tepat_waktu`
- ☐ Absen setelah jam tutup → `terlambat` + menit benar
- ☐ Absen 2× sesi sama → ditolak "sudah absen"
- ☐ QR kedaluwarsa/terpakai → pesan jelas
- ☐ Istirahat/pulang tanpa absen masuk → terkunci
- ☐ Beranda menampilkan status sesi hari ini dengan benar

## E. Riwayat, Izin & Laporan
- ☐ Kalender riwayat berwarna sesuai status
- ☐ Rekap bulan (hadir/telat/menit) akurat
- ☐ Estimasi potongan sesuai aturan
- ☐ Ajukan izin + lampiran berhasil
- ☐ Admin approve/reject → status berubah
- ☐ **Izin disetujui → status presensi ikut diperbarui** (Tahap 4)
- ☐ Ekspor Sheets berhasil
- ☐ Backup Drive berhasil
- ☐ PDF cetak rapi (kop, tabel, total, ttd)

## F. PWA & Mobile-native
- ☐ Bisa "Add to Home Screen" (Android)
- ☐ Buka dari home screen → fullscreen tanpa address bar
- ☐ Bottom nav & transisi terasa halus
- ☐ Safe-area aman (tidak tertutup notch/gesture bar)
- ☐ Target sentuh ≥48px
- ☐ Mode gelap tampil benar
- ☐ Offline → app-shell tetap tampil (tidak layar putih)
- ☐ Notifikasi push diterima (setelah install)

## G. Keamanan
- ☐ Anon key tak bisa baca tabel konfigurasi (RLS deny)
- ☐ Endpoint cron tanpa secret → 401
- ☐ `presensi/verify` tanpa login → 401
- ☐ Rate limit aktif (percobaan beruntun → 429)
- ☐ Audit log mencatat percobaan sukses & gagal
- ☐ Lampiran sanggahan hanya via signed URL

## H. Regresi setelah deploy
- ☐ Build Vercel hijau
- ☐ Cron terdaftar & jalan
- ☐ Semua env terisi di Production
- ☐ Migrasi DB terbaru sudah dijalankan
