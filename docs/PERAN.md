# QRensi — Model Peran & Kewenangan (Admin Berjenjang)

> Dibuat 2026-08-22 atas permintaan: BKPSDM tak mungkin melayani semua pegawai terpusat → perlu admin tingkat OPD.
> Basis: standar **SIMPEG** pemerintah daerah + **NIST Hierarchical RBAC**. Sumber di akhir.

---

## 1. Referensi yang dipakai

### 1.1 Standar SIMPEG (praktik nyata BKPSDM daerah)
Aplikasi kepegawaian daerah (Tasikmalaya, Magetan, Sumut, dll) memakai peran berjenjang:

| Peran SIMPEG | Lingkup | Tugas |
|---|---|---|
| **Admin (BKPSDM)** | Seluruh daerah | Pengelola penuh aplikasi |
| **UMPEG** (Urusan Kepegawaian) | 1 OPD (Dinas/Badan/Kecamatan) | Operator teknis kepegawaian di OPD-nya |
| **Verifikator** | 1 OPD | Memverifikasi data/usulan |
| **Pegawai** | Diri sendiri | Akses data pribadi |

Kunci: **operator tersebar di tiap OPD**, pegawai tetap akses datanya sendiri. Persis kebutuhan Anda.

### 1.2 NIST Hierarchical RBAC
Peran atas **mewarisi** izin peran di bawahnya (executive → manager → supervisor → staff). Praktik terbaik: peran mengikuti **fungsi jabatan nyata**, ada **tinjauan akses berkala**, dan pencabutan otomatis saat pegawai keluar (mencegah *role creep*).

---

## 2. Model peran QRensi (final)

Struktur organisasi kita: **instansi** (Pemkab Kotabaru) → **unit_kerja** (OPD: Setda, Dinas Koperasi, …) → **pegawai**.

| Peran | Padanan SIMPEG | Lingkup | Ditentukan oleh |
|---|---|---|---|
| **Super Admin** | Admin BKPSDM | Seluruh instansi & semua OPD | `admin_unit_kerja.peran='super_admin'` |
| **Admin OPD** | UMPEG | **Hanya unit kerja yang diampu** (bisa >1) | `admin_unit_kerja.peran='admin_unit'` + baris per unit |
| **Pegawai** | Pegawai | Diri sendiri | punya baris `pegawai`, tanpa baris admin |
| *(Kiosk)* | — | Perangkat, bukan akun | `device_secret` + binding |

**Pewarisan:** Super Admin ⊇ Admin OPD ⊇ Pegawai.

> **Skema saat ini sudah mendukung ini** — `admin_unit_kerja` sudah mengikat admin ke `unit_kerja`, dan satu orang bisa punya beberapa baris (mengampu beberapa OPD). Yang kurang **hanya penegakan** di lapisan aplikasi.

## 3. Matriks kewenangan

Legenda: ✅ boleh · 🔸 boleh **terbatas unitnya** · ⛔ tidak boleh

| Kemampuan | Super Admin | Admin OPD | Pegawai |
|---|:--:|:--:|:--:|
| **Pegawai** |
| Lihat daftar pegawai | ✅ semua | 🔸 unitnya | ⛔ |
| Tambah/edit pegawai | ✅ | 🔸 unitnya | ⛔ |
| Hapus/nonaktifkan pegawai | ✅ | 🔸 unitnya | ⛔ |
| Pindah pegawai antar-unit | ✅ | ⛔ | ⛔ |
| **Akun** |
| Buat akun login | ✅ | 🔸 unitnya | ⛔ |
| Reset password | ✅ | 🔸 unitnya | ⛔ |
| Ganti password sendiri | ✅ | ✅ | ✅ |
| **Enrollment wajah** |
| Enroll/ulang wajah pegawai | ✅ | 🔸 **unitnya** ← *inti permintaan* | ⛔ |
| Hapus data biometrik | ✅ | 🔸 unitnya | ⛔ (ajukan) |
| **Konfigurasi** |
| Pola hari & jam kerja | ✅ | ⛔ (usul) | ⛔ |
| Aturan potongan | ✅ | ⛔ | ⛔ |
| Kelola instansi/unit kerja | ✅ | ⛔ | ⛔ |
| **Menunjuk/mencabut admin** | ✅ | ⛔ | ⛔ |
| **Kiosk** |
| Registrasi & reset secret | ✅ | 🔸 unitnya | ⛔ |
| **Izin & Sanggahan** |
| Ajukan | ⛔ | ⛔ | ✅ |
| Setujui/tolak | ✅ | 🔸 unitnya | ⛔ |
| **Laporan & Audit** |
| Rekap & laporan | ✅ semua | 🔸 unitnya | 🔸 diri sendiri |
| Ekspor Sheets / backup Drive | ✅ | ⛔ | ⛔ |
| Audit log | ✅ semua | 🔸 unitnya | ⛔ |
| **Presensi** |
| Absen | ⛔ | ⛔ | ✅ |
| Lihat presensi | ✅ semua | 🔸 unitnya | 🔸 diri sendiri |

**Alasan pembatasan kunci:**
- **Konfigurasi jam kerja & potongan hanya Super Admin** — berdampak pada tunjangan seluruh daerah; harus satu pintu (BKPSDM).
- **Enrollment wajah didelegasikan ke Admin OPD** — menjawab masalah "tak mungkin semua pegawai ke BKPSDM", tapi tetap **didampingi petugas** (bukan self-service), sesuai keputusan Anda & blueprint.
- **Pindah pegawai antar-unit hanya Super Admin** — mencegah admin OPD "menarik" pegawai unit lain.

## 4. Rencana implementasi

### 4.1 Lapisan izin terpusat (`src/lib/izin.ts`)
Satu sumber kebenaran, dipakai semua halaman & action:
```
can(user, "pegawai.edit", { unitKerjaId })   // → boolean
assertCan(user, "pegawai.edit", { unitKerjaId })  // → lempar/redirect bila tidak boleh
scopeUnits(user)  // → null (semua) | string[] (unit yang diampu)
```
- `super_admin` → selalu boleh, `scopeUnits` = `null`.
- `admin_unit` → boleh bila `unitKerjaId ∈ unitKerjaIds`, `scopeUnits` = daftar unitnya.

### 4.2 Penegakan berlapis (defense in depth)
1. **Navigasi** — menu yang tak berwenang disembunyikan.
2. **Halaman** — `assertCan` di awal server component.
3. **Server action** — `assertCan` **wajib** sebelum menulis (lapisan yang menentukan; UI bisa diakali).
4. **Query** — otomatis difilter `scopeUnits` agar admin OPD hanya menarik data unitnya.
5. **DB/RLS** — tetap default-deny; akses lewat service-role yang sudah digating.

### 4.3 UI manajemen admin (Super Admin)
Halaman `/admin/pengguna`: daftar admin + tombol **tunjuk admin OPD** (pilih pegawai + unit), **cabut**, dan **naikkan ke super admin**. Menghapus kebutuhan SQL manual.

### 4.4 Audit
Setiap perubahan peran & aksi sensitif (reset password, hapus pegawai, ubah jam kerja) dicatat — sesuai praktik "tinjauan akses berkala".

---

## Sumber
- [SIMPEG 5.0 Kab. Tasikmalaya — Akses Sistem (peran Admin/UMPEG/Verifikator)](https://asn.tasikmalayakab.go.id/dokumentasi/akses-sistem)
- [BKPSDM Magetan — SIMPEG](https://bkpsdm.magetan.go.id/layanan-kepegawaian/bidang-pengadaan-pensiun-dan-informasi/simpeg/)
- [Media Multi Karyatama — SIMPEG multi-user & operator per OPD](https://mediamultikaryatama.id/produk/sistem-informasi-manajemen-kepegawaian)
- [IBM — What Is Role-Based Access Control (RBAC)](https://www.ibm.com/think/topics/rbac)
- [Zluri — RBAC: what it is, where it breaks, best practices](https://www.zluri.com/blog/role-based-access-control)
- [Pathlock — RBAC comprehensive guide](https://pathlock.com/blog/role-based-access-control-rbac/)
