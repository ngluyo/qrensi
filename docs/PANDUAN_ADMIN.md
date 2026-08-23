# Panduan Admin QRensi

> Untuk petugas kepegawaian yang mengelola presensi. Tidak perlu keahlian teknis.
> Panduan pemasangan (teknis) ada di [`INSTALASI.md`](INSTALASI.md).

---

## Dua jenis admin

| | **Super Admin** | **Admin Unit/OPD** |
|---|---|---|
| Lingkup | Seluruh organisasi | Hanya unit yang diampu |
| Kelola pegawai & akun | ✅ semua | ✅ di unitnya |
| Enrollment wajah | ✅ | ✅ |
| Kelola kiosk | ✅ | ✅ |
| Setujui izin | ✅ | ✅ di unitnya |
| Atur jam kerja & potongan | ✅ | ❌ |
| Pindah pegawai antar unit | ✅ | ❌ |
| Ekspor laporan | ✅ | ❌ |
| Tunjuk admin & pengaturan aplikasi | ✅ | ❌ |

Menu yang tidak berwenang **tidak ditampilkan**, dan tetap ditolak walau alamatnya diketik langsung.

---

## Rutinitas awal (sekali saja)

Kerjakan berurutan:

**1. Pengaturan Aplikasi** — isi nama aplikasi, nama organisasi, logo, warna, zona waktu.

**2. Pola Hari Kerja** — buat pola (mis. "Senin–Jumat"), centang hari aktifnya.

**3. Jam Kerja** — untuk tiap pola & hari, isi jam sesi:
- **Masuk**: jam buka–tutup (mis. 07:15–07:45) + **batas akhir** (mis. 10:00).
  Lewat batas akhir = dianggap tidak hadir, dan sesi lain hari itu terkunci.
- **Istirahat** & **Pulang**: jam buka–tutup.

> Angka bawaan hanyalah contoh. **Wajib disesuaikan** dengan aturan resmi organisasi Anda.

**4. Potongan** — aturan berjenjang, mis. telat 1–30 menit → 0,5%.
Sistem menghasilkan **persentase**, bukan rupiah; nominal dihitung bagian keuangan.

**5. Pegawai** — tambah unit kerja lalu tambah pegawai.

**6. Buat akun login** — buka detail pegawai → **Buat akun**. Kata sandi sementara
tampil **satu kali**; salin dan serahkan. Pegawai wajib menggantinya saat login pertama.

**7. Enrollment wajah** — dampingi pegawai, arahkan wajah ke kamera, simpan.
Pastikan cahaya cukup dan hanya satu wajah di layar.

**8. Kiosk** — daftarkan perangkat (nama + koordinat). *Device secret* tampil
**satu kali** — salin. Buka `/kiosk/tampilan` di perangkat kiosk, tempel secret.

**9. Pengguna & Peran** — tunjuk Admin Unit agar pekerjaan tidak menumpuk di pusat.

---

## Rutinitas harian

- **Dashboard** — lihat persentase kehadiran, siapa telat, siapa belum absen.
- **Izin & Sanggahan** — tinjau pengajuan. Bila **disetujui**, status presensi
  hari itu otomatis berubah (izin/sakit/cuti/dinas) sehingga tidak dihitung alpa.
- Kiosk cukup dibiarkan menyala; QR muncul & hilang otomatis mengikuti jadwal.

## Rutinitas bulanan

- **Laporan** → **Ekspor Google Sheets** dan/atau **Backup CSV ke Drive**.
- **Laporan siap cetak** → atur periode & unit → **Cetak / Simpan PDF**.
- Serahkan rekap persentase potongan ke bagian keuangan.

---

## Situasi umum

| Situasi | Tindakan |
|---|---|
| Pegawai lupa kata sandi | Detail pegawai → **Reset kata sandi** → serahkan yang baru |
| Pegawai ganti HP | Tidak perlu apa-apa — tidak ada penguncian perangkat di sisi pegawai |
| Wajah tidak dikenali terus | Ulangi enrollment (pencahayaan lebih baik, tanpa masker/topi) |
| Kiosk diganti/rusak | Kiosk → **Reset secret** → tempel secret baru di perangkat pengganti |
| Kiosk dipindah ruangan | Tidak masalah — lokasi tidak dipakai untuk verifikasi |
| Pegawai pindah unit | Super Admin → detail pegawai → ubah unit kerja |
| Pegawai berhenti | Ubah status jadi *nonaktif* (riwayat tetap tersimpan), atau hapus bila diminta |
| Ada dugaan kecurangan | **Audit Log** → saring hasil "gagal"/"dicurigai" |

---

## Yang perlu dipahami tentang keamanan

Sistem ini **menaikkan biaya kecurangan**, bukan menjaminnya mustahil:

- QR berganti terus & sekali pakai → screenshot tidak berguna.
- Harus dipindai dari dekat layar kiosk → membuktikan kehadiran fisik.
- Wajah diverifikasi **di server** → titip akun tidak cukup.
- Deteksi wajah asli (kedip & menoleh) → foto diam tidak lolos.

**Batasnya:** bila pemilik akun hadir sendiri lalu menyerahkan HP-nya yang sudah
login kepada orang lain, secara teknis masih mungkin. Ini berlaku pada semua
sistem sejenis. Karena itu **Audit Log** penting sebagai bukti untuk penindakan.

## Perlindungan data pribadi

Data wajah termasuk data pribadi bersifat spesifik (UU 27/2022). Pastikan:
- Ada **persetujuan tertulis** pegawai saat enrollment.
- Data wajah dihapus bila pegawai berhenti (detail pegawai → hapus data wajah).
- Keputusan yang merugikan (potongan) selalu punya **jalur sanggahan manusia**.
