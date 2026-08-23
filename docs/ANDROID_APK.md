# Membuat APK Android (TWA)

> Membungkus QRensi menjadi aplikasi Android yang bisa dipasang lewat berkas APK
> atau disebar di Play Store — **memakai kode web yang sama persis**, tanpa
> menulis ulang apa pun.

---

## Apa itu TWA & kenapa memilihnya

**TWA (Trusted Web Activity)** menjalankan situs Anda di dalam Chrome tanpa
address bar, sehingga terlihat dan terasa seperti aplikasi Android biasa.

Alternatif lain (Capacitor) **tidak dipakai** karena mengharuskan situs diekspor
statis, sedangkan QRensi memakai Server Actions, API routes, dan SSR — ekspor
statis akan mematahkan arsitekturnya ([ADR-0021](DECISIONS.md)).

**Yang didapat:** ikon di laci aplikasi, layar penuh, splash screen, notifikasi,
pembaruan otomatis (karena isinya web — cukup deploy, APK tidak perlu dibangun ulang).

**Prasyarat:** aplikasi sudah **live di HTTPS** (mis. `https://qrensi.vercel.app`).

---

## A. Cara cepat — Bubblewrap CLI (disarankan)

### 1. Pasang alat

Butuh **JDK 17** dan **Android SDK**. Bila Android Studio sudah terpasang,
keduanya biasanya sudah ada.

```bash
npm install -g @bubblewrap/cli
```

Saat pertama dijalankan, Bubblewrap menawarkan mengunduh JDK & Android SDK
otomatis — terima saja bila ragu dengan lokasi yang ada.

### 2. Inisialisasi proyek

Buat folder terpisah (**di luar** folder kode QRensi):

```bash
mkdir qrensi-android && cd qrensi-android
```

```bash
bubblewrap init --manifest https://DOMAIN-ANDA/manifest.webmanifest
```

Jawaban yang disarankan:

| Pertanyaan | Jawaban |
|---|---|
| Domain | `DOMAIN-ANDA` (tanpa `https://`) |
| Application name | ikut manifest (nama aplikasi Anda) |
| Short name | ikut manifest |
| Application ID / package | `id.qrensi.twa` — **catat, dipakai nanti** |
| Display mode | `standalone` |
| Orientation | `portrait` |
| Status bar color | ikut manifest (warna brand Anda) |
| Include support for Play Billing | **No** |
| Request geolocation permission | **No** (QRensi tidak memakai GPS) |
| Signing key | buat baru bila belum punya |

> Saat membuat **signing key**, simpan berkas `.keystore` dan kata sandinya
> **baik-baik**. Kehilangan berkas ini berarti Anda tidak bisa merilis pembaruan
> APK dengan identitas yang sama.

### 3. Bangun APK

```bash
bubblewrap build
```

Hasil: `app-release-signed.apk` (untuk dibagikan langsung) dan
`app-release-bundle.aab` (untuk Play Store).

### 4. Ambil sidik jari SHA-256

```bash
bubblewrap fingerprint list
```

Atau langsung dari keystore:

```bash
keytool -list -v -keystore android.keystore -alias android
```

Salin nilai **SHA256** — bentuknya seperti
`AB:CD:12:...:EF` (32 pasang heksadesimal).

### 5. Hubungkan APK dengan domain

Tambahkan di **Vercel → Settings → Environment Variables** (Production):

```
TWA_PACKAGE_NAME=id.qrensi.twa
TWA_SHA256_FINGERPRINT=AB:CD:12:...:EF
```

Lalu **Redeploy**. Verifikasi:

```bash
curl https://DOMAIN-ANDA/.well-known/assetlinks.json
```

Harus menampilkan paket & sidik jari Anda (bukan `[]`).

> **Bila memakai Play App Signing**, Play akan menandatangani ulang dengan kunci
> lain. Ambil sidik jari dari **Play Console → Setup → App integrity**, lalu isi
> **dua** sidik jari dipisah koma:
> `TWA_SHA256_FINGERPRINT=SIDIK_UNGGAH,SIDIK_PLAY`

### 6. Uji di perangkat

Pasang APK ke HP Android:

```bash
adb install app-release-signed.apk
```

**Tanda berhasil:** aplikasi terbuka **tanpa address bar Chrome**.
Bila address bar masih muncul, berarti assetlinks belum cocok — periksa kembali
package name & sidik jari, pastikan sudah redeploy, lalu hapus data aplikasi dan
buka ulang.

---

## B. Alternatif — PWABuilder (tanpa command line)

1. Buka https://www.pwabuilder.com
2. Masukkan URL aplikasi Anda → **Start**
3. Pilih **Android** → **Generate Package**
4. Unduh paketnya; di dalamnya sudah ada `assetlinks.json` berisi sidik jari
5. Ambil nilai `package_name` dan `sha256_cert_fingerprints` dari berkas itu,
   masukkan ke env seperti langkah A.5

---

## C. Menyebarkan APK

**Tanpa Play Store** (paling cepat untuk internal):
- Unggah APK ke Google Drive/website internal, bagikan tautannya.
- Pegawai perlu mengizinkan "Instal aplikasi tidak dikenal" saat pertama memasang.

**Lewat Play Store:**
- Gunakan berkas `.aab`.
- Butuh akun Play Console (biaya pendaftaran satu kali dari Google).
- Siapkan kebijakan privasi — **wajib** karena aplikasi memakai kamera & data biometrik.
- Pada formulir Data Safety, deklarasikan: kamera, data biometrik, dan tujuan pemakaiannya.

---

## Pertanyaan umum

**Perlu bangun ulang APK setiap ada pembaruan aplikasi?**
Tidak. Isi aplikasi diambil dari web, jadi cukup deploy seperti biasa. APK hanya
perlu dibangun ulang bila mengubah nama paket, ikon, atau versi TWA.

**Kamera berfungsi di dalam TWA?**
Ya. TWA memakai mesin Chrome, jadi izin kamera bekerja seperti di browser.

**Bagaimana dengan iPhone?**
iOS tidak mendukung TWA. Pengguna iPhone memakai Safari → **Bagikan** →
**Tambahkan ke Layar Utama**; hasilnya tetap layar penuh seperti aplikasi.

**Apakah wajib membuat APK?**
Tidak. PWA sudah bisa dipasang ke layar utama dari browser. APK berguna bila
organisasi ingin distribusi terpusat (MDM) atau kehadiran di Play Store.
