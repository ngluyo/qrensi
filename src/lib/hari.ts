/** Konvensi hari QRensi: 1=Minggu .. 7=Sabtu. Urutan tampil Senin dulu. */
export const HARI: { v: number; pendek: string; nama: string }[] = [
  { v: 2, pendek: "Sen", nama: "Senin" },
  { v: 3, pendek: "Sel", nama: "Selasa" },
  { v: 4, pendek: "Rab", nama: "Rabu" },
  { v: 5, pendek: "Kam", nama: "Kamis" },
  { v: 6, pendek: "Jum", nama: "Jumat" },
  { v: 7, pendek: "Sab", nama: "Sabtu" },
  { v: 1, pendek: "Min", nama: "Minggu" },
];

export function namaHari(v: number): string {
  return HARI.find((h) => h.v === v)?.nama ?? String(v);
}
export function pendekHari(v: number): string {
  return HARI.find((h) => h.v === v)?.pendek ?? String(v);
}
