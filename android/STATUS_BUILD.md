# Status Pembuatan APK — QRensi

Persiapan **sudah selesai**; tinggal satu komponen SDK yang perlu dipasang.

## Yang sudah siap (di `~/qrensi-android/`)

| Berkas | Isi |
|---|---|
| `android.keystore` | Kunci penandatangan APK (**cadangkan!**) |
| `keystore-password.txt` | Kata sandi keystore |
| `twa-manifest.json` | Konfigurasi TWA (salinannya ada di `android/twa-manifest.json`) |

**Sidik jari SHA-256:**
```
34:9D:B6:58:75:D4:AA:11:55:6B:B1:A0:34:81:89:68:15:AF:4A:CE:4E:76:76:C8:AE:7E:6F:ED:8E:65:5B:D0
```

**Package name:** `id.qrensi.twa`

## Yang kurang: Android SDK Command-line Tools

Bubblewrap menolak dengan pesan *"The provided androidSdk isn't correct"* karena
folder `cmdline-tools` belum ada di Android SDK Anda.

### Cara memasang (±2 menit)
1. Buka **Android Studio**
2. **Settings/Preferences → Languages & Frameworks → Android SDK**
   (atau layar awal → **More Actions → SDK Manager**)
3. Buka tab **SDK Tools**
4. Centang **Android SDK Command-line Tools (latest)**
5. **Apply** → **OK**, tunggu selesai

### Lalu jalankan build
```bash
cd ~/qrensi-android && bubblewrap build --skipPwaValidation
```

Saat diminta kata sandi keystore & kunci, pakai isi `keystore-password.txt`.

Hasil: `app-release-signed.apk` (bagi langsung) dan `app-release-bundle.aab` (Play Store).

## Setelah APK jadi

Tambahkan di **Vercel → Settings → Environment Variables** (Production):

```
TWA_PACKAGE_NAME=id.qrensi.twa
TWA_SHA256_FINGERPRINT=34:9D:B6:58:75:D4:AA:11:55:6B:B1:A0:34:81:89:68:15:AF:4A:CE:4E:76:76:C8:AE:7E:6F:ED:8E:65:5B:D0
```

Lalu **Redeploy** dan pastikan:
```bash
curl https://qrensi.vercel.app/.well-known/assetlinks.json
```
menampilkan paket & sidik jari (bukan `[]`). Barulah aplikasi terbuka tanpa address bar.

> ⚠️ **Cadangkan `android.keystore` + kata sandinya.** Bila hilang, Anda tidak
> bisa merilis pembaruan APK dengan identitas aplikasi yang sama.
