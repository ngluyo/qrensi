import test from "node:test";
import assert from "node:assert/strict";

/**
 * Uji logika kritis QRensi (MASTERPLAN 4.4).
 * Logika disalin dari src/lib agar bisa diuji tanpa toolchain TS —
 * bila logika di src berubah, perbarui di sini juga (dijaga oleh review).
 * Jalankan: npm test
 */

// ---------- jam-kerja: state machine (src/lib/jam-kerja.ts) ----------
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function evaluasiScan(sesi, now) {
  const buka = toMinutes(sesi.jam_buka);
  const tutup = toMinutes(sesi.jam_tutup);
  if (sesi.jenis_sesi === "masuk") {
    const batas = sesi.jam_batas_akhir ? toMinutes(sesi.jam_batas_akhir) : tutup;
    if (now < buka) return { diterima: false, status: "ditolak_di_luar_jendela", menit: 0 };
    if (now <= tutup) return { diterima: true, status: "tepat_waktu", menit: 0 };
    if (now <= batas) return { diterima: true, status: "terlambat", menit: now - tutup };
    return { diterima: false, status: "ditolak_di_luar_jendela", menit: 0 };
  }
  if (sesi.jenis_sesi === "istirahat") {
    if (now < buka || now > tutup) return { diterima: false, status: "ditolak_di_luar_jendela", menit: 0 };
    return { diterima: true, status: "tepat_waktu", menit: 0 };
  }
  if (now < buka) return { diterima: true, status: "pulang_cepat", menit: 0 };
  if (now <= tutup) return { diterima: true, status: "tepat_waktu", menit: 0 };
  return { diterima: false, status: "ditolak_di_luar_jendela", menit: 0 };
}

const MASUK = { jenis_sesi: "masuk", jam_buka: "07:15", jam_tutup: "07:45", jam_batas_akhir: "10:00" };
const PULANG = { jenis_sesi: "pulang", jam_buka: "16:30", jam_tutup: "17:30" };
const ISTIRAHAT = { jenis_sesi: "istirahat", jam_buka: "12:30", jam_tutup: "13:30" };

test("masuk sebelum jendela ditolak", () => {
  assert.equal(evaluasiScan(MASUK, toMinutes("07:00")).diterima, false);
});
test("masuk tepat waktu", () => {
  const r = evaluasiScan(MASUK, toMinutes("07:30"));
  assert.equal(r.status, "tepat_waktu");
  assert.equal(r.menit, 0);
});
test("masuk di batas jam_tutup masih tepat waktu", () => {
  assert.equal(evaluasiScan(MASUK, toMinutes("07:45")).status, "tepat_waktu");
});
test("terlambat menghitung menit dari jam_tutup", () => {
  const r = evaluasiScan(MASUK, toMinutes("08:00"));
  assert.equal(r.status, "terlambat");
  assert.equal(r.menit, 15);
});
test("masuk lewat batas akhir ditolak", () => {
  assert.equal(evaluasiScan(MASUK, toMinutes("10:01")).diterima, false);
});
test("pulang sebelum jendela = pulang_cepat (tetap diterima)", () => {
  const r = evaluasiScan(PULANG, toMinutes("15:00"));
  assert.equal(r.diterima, true);
  assert.equal(r.status, "pulang_cepat");
});
test("pulang setelah jam tutup ditolak", () => {
  assert.equal(evaluasiScan(PULANG, toMinutes("17:31")).diterima, false);
});
test("istirahat di luar jendela ditolak", () => {
  assert.equal(evaluasiScan(ISTIRAHAT, toMinutes("14:00")).diterima, false);
});

// ---------- potongan (src/lib/potongan.ts) ----------
function cariAturan(aturan, jenis, menit) {
  return aturan.find(
    (a) => a.jenis === jenis && menit >= a.menit_dari && (a.menit_sampai === null || menit <= a.menit_sampai),
  );
}
function hitungPotongan(presensi, aturan) {
  let total = 0;
  let menitTotal = 0;
  for (const p of presensi) {
    let persen = 0;
    if (p.status === "terlambat") {
      menitTotal += p.menit_keterlambatan;
      persen = cariAturan(aturan, "terlambat", p.menit_keterlambatan)?.persen_potongan ?? 0;
    } else if (p.status === "pulang_cepat") persen = cariAturan(aturan, "pulang_cepat", 0)?.persen_potongan ?? 0;
    else if (p.status === "tidak_hadir") persen = cariAturan(aturan, "tidak_hadir", 0)?.persen_potongan ?? 0;
    total += persen;
  }
  return { total_persen: Math.round(total * 100) / 100, total_menit_terlambat: menitTotal };
}

const ATURAN = [
  { jenis: "terlambat", menit_dari: 1, menit_sampai: 30, persen_potongan: 0.5 },
  { jenis: "terlambat", menit_dari: 31, menit_sampai: 60, persen_potongan: 1 },
  { jenis: "terlambat", menit_dari: 91, menit_sampai: null, persen_potongan: 2.5 },
  { jenis: "tidak_hadir", menit_dari: 0, menit_sampai: null, persen_potongan: 5 },
];

test("potongan: terlambat berjenjang sesuai rentang", () => {
  assert.equal(hitungPotongan([{ status: "terlambat", menit_keterlambatan: 15 }], ATURAN).total_persen, 0.5);
  assert.equal(hitungPotongan([{ status: "terlambat", menit_keterlambatan: 45 }], ATURAN).total_persen, 1);
});
test("potongan: rentang terbuka (menit_sampai null)", () => {
  assert.equal(hitungPotongan([{ status: "terlambat", menit_keterlambatan: 300 }], ATURAN).total_persen, 2.5);
});
test("potongan: menit di celah aturan tidak dipotong", () => {
  // 61-90 tidak didefinisikan pada ATURAN uji ini
  assert.equal(hitungPotongan([{ status: "terlambat", menit_keterlambatan: 75 }], ATURAN).total_persen, 0);
});
test("potongan: alpa dipotong penuh & akumulatif", () => {
  const r = hitungPotongan(
    [{ status: "tidak_hadir", menit_keterlambatan: 0 }, { status: "terlambat", menit_keterlambatan: 10 }],
    ATURAN,
  );
  assert.equal(r.total_persen, 5.5);
  assert.equal(r.total_menit_terlambat, 10);
});
test("potongan: status hadir/izin tidak memotong", () => {
  const r = hitungPotongan(
    [{ status: "tepat_waktu", menit_keterlambatan: 0 }, { status: "izin", menit_keterlambatan: 0 }],
    ATURAN,
  );
  assert.equal(r.total_persen, 0);
});

// ---------- izin (src/lib/awal terapkan-izin.ts) ----------
function bolehTimpa(statusLama) {
  return !(statusLama === "tepat_waktu" || statusLama === "terlambat");
}
test("izin tidak menimpa kehadiran faktual", () => {
  assert.equal(bolehTimpa("tepat_waktu"), false);
  assert.equal(bolehTimpa("terlambat"), false);
});
test("izin menimpa alpa & tidak-di-kantor", () => {
  assert.equal(bolehTimpa("tidak_hadir"), true);
  assert.equal(bolehTimpa("tidak_ada_di_kantor"), true);
});

// ---------- izin/peran (src/lib/izin.ts) ----------
const KHUSUS_SUPER = new Set([
  "pegawai.pindah_unit", "konfig.jam_kerja", "konfig.potongan",
  "konfig.unit_kerja", "konfig.instansi", "peran.kelola", "laporan.ekspor",
]);
function can(user, aksi, ctx = {}) {
  if (!user || !user.peran) return false;
  if (user.peran === "super_admin") return true;
  if (KHUSUS_SUPER.has(aksi)) return false;
  if (ctx.unitKerjaId === undefined) return true;
  if (!ctx.unitKerjaId) return false;
  return user.unitKerjaIds.includes(ctx.unitKerjaId);
}
const SUP = { peran: "super_admin", unitKerjaIds: ["U1"] };
const OPD = { peran: "admin_unit", unitKerjaIds: ["U1"] };

test("peran: super admin boleh segalanya", () => {
  assert.equal(can(SUP, "konfig.jam_kerja"), true);
  assert.equal(can(SUP, "pegawai.edit", { unitKerjaId: "U2" }), true);
});
test("peran: admin OPD dibatasi unitnya", () => {
  assert.equal(can(OPD, "pegawai.edit", { unitKerjaId: "U1" }), true);
  assert.equal(can(OPD, "pegawai.edit", { unitKerjaId: "U2" }), false);
});
test("peran: admin OPD boleh enrollment wajah unitnya", () => {
  assert.equal(can(OPD, "wajah.enroll", { unitKerjaId: "U1" }), true);
});
test("peran: admin OPD ditolak untuk kewenangan super", () => {
  for (const a of KHUSUS_SUPER) assert.equal(can(OPD, a, { unitKerjaId: "U1" }), false, a);
});
test("peran: pegawai & anonim ditolak", () => {
  assert.equal(can({ peran: null, unitKerjaIds: [] }, "pegawai.lihat"), false);
  assert.equal(can(null, "pegawai.lihat"), false);
});
