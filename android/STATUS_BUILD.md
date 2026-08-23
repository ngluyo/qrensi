# APK QRensi — SELESAI DIBANGUN ✅

## Hasil

Berkas ada di **`C:\Users\waluh\Downloads\QRensi-APK\`**:

| Berkas | Ukuran | Kegunaan |
|---|---|---|
| `QRensi-1.0.2.apk` | ~1,2 MB | Pasang langsung ke HP Android |
| `QRensi-1.0.2.aab` | ~1,2 MB | Unggah ke Google Play Store |
| `android.keystore` | 2,7 KB | **Kunci penandatangan — CADANGKAN!** |
| `keystore-password.txt` | — | Kata sandi keystore |

**Package name:** `id.qrensi.twa` · **Versi:** 1.0.2
**Sidik jari SHA-256:**
```
34:9D:B6:58:75:D4:AA:11:55:6B:B1:A0:34:81:89:68:15:AF:4A:CE:4E:76:76:C8:AE:7E:6F:ED:8E:65:5B:D0
```

> ⚠️ **Cadangkan `android.keystore` + kata sandinya** (mis. ke Google Drive pribadi).
> Bila hilang, Anda tidak bisa merilis pembaruan APK dengan identitas yang sama —
> harus membuat aplikasi baru dari nol.

---

## LANGKAH WAJIB: hubungkan APK dengan domain

Tanpa ini, aplikasi tetap berjalan tetapi **masih menampilkan address bar Chrome**.

1. Buka **Vercel → project qrensi → Settings → Environment Variables**
2. Tambahkan dua variabel (lingkungan **Production**):

```
TWA_PACKAGE_NAME=id.qrensi.twa
TWA_SHA256_FINGERPRINT=34:9D:B6:58:75:D4:AA:11:55:6B:B1:A0:34:81:89:68:15:AF:4A:CE:4E:76:76:C8:AE:7E:6F:ED:8E:65:5B:D0
```

3. **Redeploy**
4. Verifikasi — harus menampilkan paket & sidik jari (bukan `[]`):
   ```bash
   curl https://qrensi.vercel.app/.well-known/assetlinks.json
   ```
5. Di HP: hapus data aplikasi lalu buka lagi → address bar hilang.

---

## Cara memasang di HP

**Kirim berkas APK** ke HP (WhatsApp/Drive/kabel USB), lalu buka berkasnya.
Android akan meminta izin "Instal aplikasi tidak dikenal" — izinkan untuk
aplikasi pengirim (mis. Files/Chrome), lalu **Instal**.

---

## Membangun ulang (bila perlu)

APK **tidak perlu** dibangun ulang setiap ada pembaruan aplikasi — isinya diambil
dari web, jadi cukup deploy seperti biasa. Bangun ulang hanya bila mengubah nama
paket, ikon, atau versi.

```bash
cd ~/qrensi-android
./gradlew.bat assembleRelease bundleRelease --no-daemon
```

Lalu tandatangani:
```bash
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"; BT="$ANDROID_HOME/build-tools/36.1.0"
"$BT/zipalign.exe" -p -f 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release-aligned.apk
"$BT/apksigner.bat" sign --ks android.keystore --ks-key-alias android --out app-release-signed.apk app-release-aligned.apk
```

## Catatan lingkungan

Agar Bubblewrap/Gradle mengenali Android SDK, dibuat *junction*:
`…\Android\Sdk\tools` → `…\Android\Sdk\cmdline-tools\latest`
(perubahan kecil & bisa dihapus kapan saja tanpa memengaruhi Android Studio).

Build tools **36.1.0** juga dipasang karena versi itu yang diminta Bubblewrap.
