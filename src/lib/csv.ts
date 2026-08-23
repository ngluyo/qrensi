/**
 * Parser CSV sederhana namun tahan kasus nyata:
 *  - BOM dari Excel (﻿)
 *  - Pemisah koma ATAU titik-koma (Excel dengan lokal Indonesia memakai ";")
 *  - Tanda kutip ganda, termasuk "" sebagai escape dan koma di dalam kutip
 *  - Akhir baris CRLF/LF, baris kosong dilewati
 */

export function deteksiPemisah(teks: string): "," | ";" | "\t" {
  const barisPertama = teks.split(/\r?\n/, 1)[0] ?? "";
  // Hitung hanya yang di luar tanda kutip.
  let dalamKutip = false;
  const jumlah = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of barisPertama) {
    if (ch === '"') dalamKutip = !dalamKutip;
    else if (!dalamKutip && (ch === "," || ch === ";" || ch === "\t")) {
      jumlah[ch as keyof typeof jumlah]++;
    }
  }
  if (jumlah[";"] > jumlah[","] && jumlah[";"] >= jumlah["\t"]) return ";";
  if (jumlah["\t"] > jumlah[","] && jumlah["\t"] > jumlah[";"]) return "\t";
  return ",";
}

/** Pecah teks CSV menjadi array baris berisi array kolom. */
export function parseCsv(teksAsli: string): string[][] {
  const teks = teksAsli.replace(/^﻿/, ""); // buang BOM
  const pemisah = deteksiPemisah(teks);

  const baris: string[][] = [];
  let kolom: string[] = [];
  let nilai = "";
  let dalamKutip = false;

  for (let i = 0; i < teks.length; i++) {
    const ch = teks[i];

    if (dalamKutip) {
      if (ch === '"') {
        if (teks[i + 1] === '"') {
          nilai += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        nilai += ch;
      }
      continue;
    }

    if (ch === '"') {
      dalamKutip = true;
    } else if (ch === pemisah) {
      kolom.push(nilai.trim());
      nilai = "";
    } else if (ch === "\n") {
      kolom.push(nilai.trim());
      if (kolom.some((k) => k !== "")) baris.push(kolom);
      kolom = [];
      nilai = "";
    } else if (ch === "\r") {
      // diabaikan; \n yang menutup baris
    } else {
      nilai += ch;
    }
  }

  // baris terakhir tanpa newline
  kolom.push(nilai.trim());
  if (kolom.some((k) => k !== "")) baris.push(kolom);

  return baris;
}

/** Normalisasi nama kolom: huruf kecil, tanpa spasi/garis bawah/tanda baca. */
export function normalKolom(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_.-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}
