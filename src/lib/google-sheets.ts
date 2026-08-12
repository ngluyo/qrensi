import { google } from "googleapis";

/**
 * Integrasi Google Sheets (lapisan sekunder — ekspor rekap, bukan DB utama).
 * SERVER-ONLY. Auth via service account (blueprint §3.2).
 */

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error("Kredensial Google service account belum diset");
  // Private key di env sering ber-escape \n → kembalikan ke newline asli.
  const key = rawKey.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export interface RekapRow {
  nama: string;
  nip: string;
  unit: string;
  hadir: number;
  terlambat: number;
  menitTerlambat: number;
  tidakHadir: number;
  tidakDiKantor: number;
  potonganPersen: number;
}

/**
 * Tulis rekap bulanan ke spreadsheet (tab dibuat bila belum ada), overwrite.
 * Return jumlah baris + URL sheet.
 */
export async function exportRekapBulanan(
  spreadsheetId: string,
  namaTab: string,
  periode: string,
  rows: RekapRow[],
): Promise<{ baris: number; url: string }> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });

  // Pastikan tab ada.
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const ada = meta.data.sheets?.some((s) => s.properties?.title === namaTab);
  if (!ada) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: namaTab } } }] },
    });
  }

  const header = [
    "Nama",
    "NIP",
    "Unit",
    "Hadir (hari)",
    "Terlambat (x)",
    "Menit telat",
    "Tidak hadir",
    "Tidak di kantor",
    "Potongan (%)",
  ];
  const values = [
    [`Rekap Presensi — ${periode}`],
    header,
    ...rows.map((r) => [
      r.nama,
      r.nip,
      r.unit,
      r.hadir,
      r.terlambat,
      r.menitTerlambat,
      r.tidakHadir,
      r.tidakDiKantor,
      r.potonganPersen,
    ]),
  ];

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${namaTab}!A1:Z1000` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${namaTab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return {
    baris: rows.length,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
