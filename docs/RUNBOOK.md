# Runbook Operasional QRensi

> Untuk pengelola teknis sistem. Berisi pemeriksaan rutin, pemulihan masalah,
> dan batas-batas yang perlu dipantau.

---

## Pemeriksaan cepat

**Alat pertama yang dibuka saat ada laporan masalah:**

| Alat | Alamat | Kegunaan |
|---|---|---|
| Diagnostik | `/admin/diagnostik` | Cek konfigurasi menyeluruh (butuh Super Admin) |
| Health check | `/api/health` | Cek cepat database (bisa dipakai monitoring/uptime) |
| Audit Log | `/admin/audit-log` | Jejak percobaan presensi (sukses/gagal/dicurigai) |
| Log Vercel | Vercel → Deployments → Logs | Galat runtime |

---

## Jadwal otomatis (cron)

| Pekerjaan | Waktu | Fungsi |
|---|---|---|
| `tutup-sesi-harian` | 23:30 WITA | Menandai `tidak_hadir` & `tidak_ada_di_kantor` |
| `laporan-harian` | 23:45 WITA | Ekspor Sheets + cadangan CSV ke Drive |

Keduanya **idempoten** — aman bila terpanggil ulang.

**Menjalankan manual** (bila cron gagal):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN-ANDA/api/cron/tutup-sesi-harian
```

> Paket Vercel Hobby membatasi cron **1×/hari per pekerjaan**. Jangan mempersering
> jadwal — deploy akan ditolak. Bila butuh lebih sering, pakai pemicu eksternal
> gratis (mis. cron-job.org) yang memanggil URL di atas dengan header yang sama.

---

## Batas paket gratis yang perlu dipantau

| Layanan | Batas | Tanda mendekati batas | Tindakan |
|---|---|---|---|
| Supabase database | 500 MB | — | Arsipkan `presensi_verifikasi_log` lama |
| Supabase storage | 1 GB | Upload gagal | Hapus lampiran sanggahan lama |
| Supabase egress | 5 GB/bulan | Halaman lambat | Kurangi ukuran foto |
| Vercel bandwidth | 100 GB/bulan | — | Umumnya aman |
| Upstash Redis | 10.000 perintah/hari | Rate limit jatuh ke mode memori | Naikkan paket bila perlu |
| Google Sheets API | ~60 tulis/menit | Ekspor gagal | Ekspor terjadwal, bukan manual berulang |

**Pembersihan berkala yang disarankan (per 3 bulan):**
```sql
-- Token QR kedaluwarsa tidak lagi berguna
delete from qr_token where expires_at < now() - interval '7 days';

-- Log verifikasi lebih dari 1 tahun (arsipkan dulu bila diperlukan audit)
delete from presensi_verifikasi_log where created_at < now() - interval '1 year';
```

---

## Pemulihan masalah

### Pegawai tidak bisa absen sama sekali
1. Cek `/admin/diagnostik` → bagian "Jam kerja" & "Perangkat kiosk".
2. Pastikan hari ini termasuk hari aktif pada polanya.
3. Pastikan sekarang berada di dalam jendela sesi.
4. Cek kiosk: QR tampil? Bila "Belum ada sesi", berarti jadwal belum terbuka.

### QR tidak muncul di kiosk
| Pesan di kiosk | Penyebab | Tindakan |
|---|---|---|
| "Belum ada sesi absensi" | Di luar jam kerja | Normal; tunggu jadwal |
| "Secret salah / kiosk nonaktif" | Secret keliru atau kiosk dimatikan | Aktifkan kembali / reset secret |
| "Terikat ke perangkat lain" | Secret dipakai perangkat lain | Admin → Kiosk → **Reset secret** |

### Verifikasi wajah selalu gagal untuk satu orang
Ulangi enrollment. Bila tetap gagal, hapus data wajahnya — sistem otomatis
melewati verifikasi wajah bagi yang belum terdaftar, sehingga pegawai tetap
bisa absen sementara masalah ditelusuri.

### Status presensi salah
1. Pegawai mengajukan **sanggahan**.
2. Admin menyetujui → status presensi diperbaiki otomatis.
3. Semua keputusan tercatat di `audit_admin`.

### Deploy gagal di Vercel
- **"commit author did not have contributing access"** → commit harus dibuat oleh
  akun pemilik project Vercel (batasan paket Hobby untuk repo privat).
- **Cron ditolak** → jadwal lebih sering dari 1×/hari.

---

## Rotasi kunci

Bila ada kunci yang bocor:

| Kunci | Dampak saat diganti |
|---|---|
| `QR_SIGNING_SECRET` | Semua QR & token wajah aktif langsung hangus (pegawai cukup memindai ulang) |
| `SUPABASE_SERVICE_ROLE_KEY` | Regenerate di Supabase → perbarui env → redeploy |
| `CRON_SECRET` | Perbarui env; cron memakai nilai baru otomatis |
| Device secret kiosk | Admin → Kiosk → Reset secret → tempel di perangkat |

Setelah mengubah env di Vercel, **wajib redeploy** agar berlaku.

---

## Cadangan & pemulihan

- **Otomatis harian:** CSV rekap ke Google Drive (folder "QRensi Backup").
- **Basis data:** Supabase menyediakan backup harian pada paket berbayar.
  Untuk paket gratis, unduh berkala lewat Supabase → Database → Backups,
  atau ekspor manual tabel penting.
- **Kode:** ada di GitHub. Pemulihan penuh = deploy ulang + `SETUP.sql` + restore data.

---

## Kontak & eskalasi

| Masalah | Ditangani |
|---|---|
| Pegawai tidak bisa absen | Admin unit |
| Konfigurasi jam kerja/potongan | Super Admin |
| Aplikasi mati total / galat sistem | Pengelola teknis (cek Diagnostik & log Vercel) |
| Dugaan kecurangan | Super Admin via Audit Log, diteruskan ke kepegawaian |
