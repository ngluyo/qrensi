"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { assertCan, scopeUnits } from "@/lib/izin";
import { createAdminClient } from "@/lib/supabase/server";
import { catatAudit } from "@/lib/audit";
import { parseCsv, normalKolom } from "@/lib/csv";

/** Kolom yang dikenali (alias agar toleran terhadap variasi penulisan). */
const ALIAS: Record<string, string[]> = {
  nama: ["nama", "namalengkap", "namapegawai", "name"],
  nip: ["nip", "nomorinduk", "nipnrp", "nik", "id"],
  jabatan: ["jabatan", "posisi", "position"],
  unit: ["unit", "unitkerja", "opd", "bagian", "divisi", "departemen"],
  pola: ["pola", "polahari", "polaharikerja", "jadwal", "polakerja"],
  email: ["email", "surel", "emailkantor"],
  nohp: ["nohp", "hp", "telepon", "telp", "nomorhp", "phone"],
  alamat: ["alamat", "address"],
};

export interface BarisImpor {
  no: number;
  nama: string;
  nip: string | null;
  jabatan: string | null;
  unitNama: string;
  unitId: string | null;
  polaNama: string;
  polaId: string | null;
  email: string | null;
  noHp: string | null;
  alamat: string | null;
  status: "siap" | "duplikat" | "galat";
  pesan?: string;
}

export interface HasilPratinjau {
  ok: boolean;
  message?: string;
  baris?: BarisImpor[];
  ringkas?: { siap: number; duplikat: number; galat: number };
  /** Nama unit di berkas yang belum ada di sistem. */
  unitBaru?: string[];
}

async function konteks() {
  const user = await requireAdmin();
  assertCan(user, "pegawai.tambah");
  const db = createAdminClient();
  const lingkup = scopeUnits(user);

  let unitQ = db.from("unit_kerja").select("id, nama").eq("instansi_id", user.instansiId);
  if (lingkup) unitQ = unitQ.in("id", lingkup.length ? lingkup : ["-"]);
  const [{ data: units }, { data: pola }, { data: pegawaiAda }] = await Promise.all([
    unitQ,
    db.from("pola_hari_kerja").select("id, nama").eq("instansi_id", user.instansiId),
    db.from("pegawai").select("nip, nama").eq("instansi_id", user.instansiId),
  ]);

  return { user, db, lingkup, units: units ?? [], pola: pola ?? [], pegawaiAda: pegawaiAda ?? [] };
}

function petakanKolom(header: string[]): Record<string, number> {
  const peta: Record<string, number> = {};
  header.forEach((h, i) => {
    const n = normalKolom(h);
    for (const [kunci, daftar] of Object.entries(ALIAS)) {
      if (daftar.includes(n) && peta[kunci] === undefined) peta[kunci] = i;
    }
  });
  return peta;
}

/** Tahap 1: baca & validasi berkas TANPA menulis apa pun. */
export async function pratinjauImpor(
  _prev: HasilPratinjau,
  formData: FormData,
): Promise<HasilPratinjau> {
  const { units, pola, pegawaiAda } = await konteks();

  const file = formData.get("berkas");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih berkas CSV." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Berkas maksimal 2MB." };

  const teks = await file.text();
  const rows = parseCsv(teks);
  if (rows.length < 2) return { ok: false, message: "Berkas kosong atau hanya berisi judul kolom." };

  const peta = petakanKolom(rows[0]);
  if (peta.nama === undefined) {
    return {
      ok: false,
      message: `Kolom "nama" tidak ditemukan. Judul kolom terbaca: ${rows[0].join(" | ")}`,
    };
  }

  const unitByNama = new Map(units.map((u) => [normalKolom(u.nama as string), u.id as string]));
  const polaByNama = new Map(pola.map((p) => [normalKolom(p.nama as string), p.id as string]));
  const nipAda = new Set(pegawaiAda.filter((p) => p.nip).map((p) => normalKolom(p.nip as string)));
  const namaAda = new Set(pegawaiAda.map((p) => normalKolom(p.nama as string)));

  const polaDefault = pola.length === 1 ? (pola[0].id as string) : null;
  const unitDefault = units.length === 1 ? (units[0].id as string) : null;

  const ambil = (r: string[], k: string) =>
    peta[k] !== undefined ? (r[peta[k]] ?? "").trim() : "";

  const baris: BarisImpor[] = [];
  const nipDiBerkas = new Set<string>();
  const unitBaru = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nama = ambil(r, "nama");
    const nip = ambil(r, "nip") || null;
    const unitNama = ambil(r, "unit");
    const polaNama = ambil(r, "pola");

    const unitId = unitNama ? (unitByNama.get(normalKolom(unitNama)) ?? null) : unitDefault;
    const polaId = polaNama ? (polaByNama.get(normalKolom(polaNama)) ?? null) : polaDefault;

    let status: BarisImpor["status"] = "siap";
    let pesan: string | undefined;

    if (!nama) {
      status = "galat";
      pesan = "Nama kosong";
    } else if (unitNama && !unitId) {
      status = "galat";
      pesan = `Unit "${unitNama}" belum ada di sistem`;
      unitBaru.add(unitNama);
    } else if (!unitId) {
      status = "galat";
      pesan = "Unit kerja tidak diisi dan tidak ada unit default";
    } else if (polaNama && !polaId) {
      status = "galat";
      pesan = `Pola "${polaNama}" tidak dikenal`;
    } else if (!polaId) {
      status = "galat";
      pesan = "Pola hari kerja tidak diisi dan tidak ada pola default";
    } else if (nip && nipDiBerkas.has(normalKolom(nip))) {
      status = "duplikat";
      pesan = "NIP ganda di dalam berkas ini";
    } else if (nip && nipAda.has(normalKolom(nip))) {
      status = "duplikat";
      pesan = "NIP sudah terdaftar";
    } else if (!nip && namaAda.has(normalKolom(nama))) {
      status = "duplikat";
      pesan = "Nama sudah terdaftar (tanpa NIP pembanding)";
    }

    if (nip) nipDiBerkas.add(normalKolom(nip));

    baris.push({
      no: i,
      nama,
      nip,
      jabatan: ambil(r, "jabatan") || null,
      unitNama: unitNama || units.find((u) => u.id === unitId)?.nama || "-",
      unitId,
      polaNama: polaNama || pola.find((p) => p.id === polaId)?.nama || "-",
      polaId,
      email: (ambil(r, "email") || null)?.toLowerCase() ?? null,
      noHp: ambil(r, "nohp") || null,
      alamat: ambil(r, "alamat") || null,
      status,
      pesan,
    });
  }

  return {
    ok: true,
    baris,
    unitBaru: [...unitBaru],
    ringkas: {
      siap: baris.filter((b) => b.status === "siap").length,
      duplikat: baris.filter((b) => b.status === "duplikat").length,
      galat: baris.filter((b) => b.status === "galat").length,
    },
  };
}

export interface HasilSimpan {
  ok: boolean;
  message?: string;
  dibuat?: number;
  akun?: { nama: string; email: string; password: string }[];
}

/** Tahap 2: simpan baris yang berstatus "siap". */
export async function simpanImpor(
  _prev: HasilSimpan,
  formData: FormData,
): Promise<HasilSimpan> {
  const { user, db } = await konteks();

  let baris: BarisImpor[];
  try {
    baris = JSON.parse(String(formData.get("data") || "[]"));
  } catch {
    return { ok: false, message: "Data pratinjau tidak terbaca. Ulangi unggah." };
  }
  const buatAkun = formData.get("buat_akun") === "on";
  const siap = baris.filter((b) => b.status === "siap");
  if (siap.length === 0) return { ok: false, message: "Tidak ada baris yang siap disimpan." };

  const lingkup = scopeUnits(user);
  const akun: HasilSimpan["akun"] = [];
  let dibuat = 0;

  for (const b of siap) {
    if (!b.unitId || !b.polaId) continue;
    // Pertahanan berlapis: admin OPD tak boleh menyisipkan ke unit lain.
    if (lingkup && !lingkup.includes(b.unitId)) continue;

    const { data: peg, error } = await db
      .from("pegawai")
      .insert({
        instansi_id: user.instansiId,
        unit_kerja_id: b.unitId,
        pola_hari_kerja_id: b.polaId,
        nama: b.nama,
        nip: b.nip,
        jabatan: b.jabatan,
        no_hp: b.noHp,
        email_kontak: b.email,
        alamat: b.alamat,
      })
      .select("id")
      .single();
    if (error || !peg) continue;
    dibuat++;

    if (buatAkun) {
      const email = b.email || (b.nip ? `${b.nip.toLowerCase().replace(/\s+/g, "")}@qrensi.local` : null);
      if (!email) continue;
      const password = "Qrensi!" + randomBytes(4).toString("hex");
      const { data: created, error: eAuth } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (eAuth || !created?.user) continue;
      await db.from("pegawai").update({ auth_user_id: created.user.id }).eq("id", peg.id);
      akun.push({ nama: b.nama, email, password });
    }
  }

  await catatAudit(db, user, "pegawai.impor", {
    tabel: "pegawai",
    detail: { dibuat, akun_dibuat: akun.length },
  });

  revalidatePath("/admin/pegawai");
  return { ok: true, dibuat, akun };
}
