# Halaman Setup Web

> Cara membuat administrator pertama **lewat browser**, tanpa perlu membuka
> terminal. Ditujukan bagi organisasi yang memasang QRensi sendiri.

---

## Apa ini?

Saat QRensi baru dipasang, database masih kosong — belum ada satu pun akun.
Tanpa halaman ini, calon admin harus menjalankan perintah di terminal
(`node scripts/buat-admin.mjs …`), yang menyulitkan pengguna non-teknis.

**Halaman setup** mendeteksi kondisi "belum ada Super Admin" lalu menampilkan
formulir singkat untuk membuat akun administrator pertama sekaligus mengisi
identitas organisasi.

## Kapan muncul?

Otomatis. Selama **belum ada satu pun Super Admin**, membuka alamat aplikasi
(`/`) atau halaman login (`/login`) akan dialihkan ke **`/setup`**.

Begitu administrator pertama dibuat, halaman ini **tertutup permanen** —
membukanya kembali akan dialihkan ke halaman login.

## Cara memakai

1. Buka alamat aplikasi Anda, mis. `https://presensi-organisasi.vercel.app`
2. Anda akan langsung diarahkan ke halaman setup.
3. Isi **Identitas organisasi**:
   - **Nama organisasi** — mis. `Pemerintah Kabupaten X`, `PT Maju Jaya`, `SMAN 1`
   - **Nama aplikasi** — nama yang tampil di judul & aplikasi PWA (boleh dibiarkan)
   - **Zona waktu** — WIB / WITA / WIT sesuai lokasi kantor
4. Isi **Akun administrator**:
   - Nama lengkap, email, dan kata sandi (minimal 8 karakter)
   - Gunakan ikon 👁 untuk memastikan ketikan kata sandi benar
5. Klik **Buat akun & mulai**
6. Klik **Masuk sekarang**, lalu login dengan email & kata sandi tadi

> Berbeda dengan akun yang dibuat admin untuk pegawai, kata sandi di sini Anda
> pilih sendiri — jadi tidak ada paksaan ganti kata sandi saat login pertama.

## Yang dibuat otomatis

| Objek | Nilai awal |
|---|---|
| Instansi | Sesuai nama organisasi yang diisi |
| Unit kerja | `Sekretariat` (bisa diubah/ditambah nanti) |
| Pola hari kerja | `Senin-Jumat` (hari aktif Senin–Jumat) |
| Akun admin | Sesuai email & kata sandi yang diisi, peran **Super Admin** |
| Pengaturan aplikasi | Nama aplikasi, nama organisasi, zona waktu |

## Setelah setup

Lanjutkan konfigurasi di **Panel Admin**, berurutan:

1. **Jam Kerja** — sesuaikan jam masuk/istirahat/pulang dengan aturan organisasi
   *(nilai bawaan hanya contoh — wajib disesuaikan)*
2. **Potongan** — aturan potongan berjenjang (boleh dikosongkan)
3. **Pegawai** — tambah unit kerja lain, lalu tambah pegawai
   (satu per satu atau **Impor CSV** untuk banyak sekaligus)
4. **Kiosk** — daftarkan perangkat penampil QR
5. **Enrollment** — daftarkan wajah pegawai
6. **Diagnostik** — pastikan semua pemeriksaan hijau

Panduan lengkap tiap langkah ada di [`PANDUAN_ADMIN.md`](PANDUAN_ADMIN.md).

---

## Keamanan

Wajar bila muncul pertanyaan: *"apakah orang lain bisa membuka `/setup` lalu
mengambil alih sistem?"* Tidak, karena:

- Halaman hanya aktif ketika **belum ada Super Admin sama sekali**.
- Pemeriksaan dilakukan **di server**, bukan hanya menyembunyikan tombol —
  mengirim data langsung ke server pun tetap ditolak bila admin sudah ada.
- Setelah admin pertama dibuat, satu-satunya cara menambah admin adalah lewat
  **Panel Admin → Pengguna & Peran** oleh Super Admin yang sudah masuk.

**Praktik yang disarankan:** lakukan setup **segera** setelah deploy pertama,
jangan biarkan instalasi kosong terbuka di internet berhari-hari.

## Alternatif lewat terminal

Bila lebih suka baris perintah (mis. saat otomasi), skrip lama tetap tersedia:

```bash
node scripts/buat-admin.mjs admin@organisasi.id "Nama Admin"
```

Skrip ini membuat kata sandi sementara acak dan memaksa penggantian saat login
pertama. Keduanya sah — pilih salah satu.

## Bila terjadi masalah

| Gejala | Penyebab & solusi |
|---|---|
| `/setup` mengalihkan ke login padahal belum punya akun | Sudah ada Super Admin di database. Pakai akun itu, atau reset lewat Supabase |
| Muncul galat saat menyimpan | Skema database belum dijalankan — jalankan `supabase/SETUP.sql` |
| "Setup sudah pernah dilakukan" | Ada yang menyelesaikan setup lebih dulu. Periksa tabel `admin_unit_kerja` |
| Lupa kata sandi admin pertama | Reset lewat Supabase → Authentication → pilih user → Reset password |
